import crypto from 'crypto';
import {
  getSubscriptionByCustomerId,
  sendMethodNotAllowed,
  stripeRequest,
  subscriptionToRow,
  upsertSubscription,
  recordTrialUsage
} from './_billing.js';

const WEBHOOK_TOLERANCE_SECONDS = 300;

export const config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function verifyStripeSignature(rawBody, signatureHeader) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  if (!signatureHeader) throw new Error('Missing Stripe-Signature header');

  const parts = String(signatureHeader).split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (!key || !value) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(value);
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 || [];
  if (!timestamp || !signatures.length) throw new Error('Invalid Stripe-Signature header');

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    !Number.isFinite(timestampSeconds)
    || Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS
  ) {
    throw new Error('Expired Stripe webhook signature');
  }

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const valid = signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature, 'hex');
    return signatureBuffer.length === expectedBuffer.length
      && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  });

  if (!valid) throw new Error('Invalid Stripe webhook signature');
}

async function upsertFromSubscription(subscription, fallbackUserId) {
  let userId = subscription?.metadata?.supabase_user_id || fallbackUserId || null;
  const customerId = typeof subscription?.customer === 'string'
    ? subscription.customer
    : subscription?.customer?.id || null;

  if (!userId && customerId) {
    const existing = await getSubscriptionByCustomerId(customerId);
    userId = existing?.user_id || null;
  }

  if (!userId) {
    console.warn('[stripe-webhook] subscription without supabase_user_id:', subscription?.id);
    return null;
  }

  return upsertSubscription(subscriptionToRow(subscription, userId));
}

// Registra que este email ya consumió su periodo de prueba.
// Se dispara cuando la suscripción nace (o existe) en estado 'trialing'.
// Es idempotente: recordTrialUsage usa ignore-duplicates, así que repetir no daña.
async function registerTrialIfApplicable(subscription) {
  if (subscription?.status !== 'trialing') return;
  const emailNormalized = subscription?.metadata?.email_normalized;
  if (!emailNormalized) {
    console.warn('[stripe-webhook] trialing subscription without email_normalized:', subscription?.id);
    return;
  }
  try {
    await recordTrialUsage(emailNormalized);
  } catch (err) {
    // No tumbamos el webhook por esto: registramos y seguimos.
    console.error('[stripe-webhook] recordTrialUsage failed:', err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendMethodNotAllowed(res, 'POST');

  let event;

  try {
    const rawBody = await readRawBody(req);
    verifyStripeSignature(rawBody, req.headers['stripe-signature']);
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('[stripe-webhook] verification error:', err);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.supabase_user_id || null;
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

      if (userId && subscriptionId) {
        const subscription = await stripeRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
        await upsertFromSubscription(subscription, userId);
        // Si el checkout creó un trial, deja constancia del email:
        await registerTrialIfApplicable(subscription);
      }
    }

    if (
      event.type === 'customer.subscription.created'
      || event.type === 'customer.subscription.updated'
      || event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object;
      await upsertFromSubscription(subscription);
      // Cubre el caso de trials creados fuera del checkout.session.completed:
      await registerTrialIfApplicable(subscription);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
