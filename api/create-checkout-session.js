import {
  getBearerToken,
  getPublicAppUrl,
  getSubscriptionByUserId,
  sendMethodNotAllowed,
  stripeRequest,
  validateSupabaseUser,
  normalizeEmail
} from './_billing.js';

const BLOCKED_CHECKOUT_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'paused'
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, 'POST');
  }

  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const user = await validateSupabaseUser(token);

    if (!user?.id) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }

    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({
        error: 'Server configuration error: missing STRIPE_PRICE_ID'
      });
    }

    const existingSubscription = await getSubscriptionByUserId(user.id);

    if (BLOCKED_CHECKOUT_STATUSES.has(existingSubscription?.status)) {
      return res.status(409).json({
        error: 'Ya tienes una suscripción o una prueba activa. Gestiona tu plan desde el portal de cliente.'
      });
    }

    const emailNorm = normalizeEmail(user.email);

    if (!emailNorm.ok && emailNorm.reason === 'disposable') {
      return res.status(403).json({
        error: 'Usa un email permanente para registrarte (no se admiten correos temporales).'
      });
    }

    const appUrl = getPublicAppUrl();

    const form = {
      mode: 'subscription',
      locale: 'es',
      client_reference_id: user.id,

      'line_items[0][price]': process.env.STRIPE_PRICE_ID,
      'line_items[0][quantity]': 1,

      // Prueba gratuita de 10 días.
      'subscription_data[trial_period_days]': '10',

      // No solicita tarjeta ni otro método de pago durante el alta.
      payment_method_collection: 'if_required',

      // Al terminar el trial sin método de pago, Stripe cancela la suscripción.
      'subscription_data[trial_settings][end_behavior][missing_payment_method]': 'cancel',

      'metadata[supabase_user_id]': user.id,
      'subscription_data[metadata][supabase_user_id]': user.id,
      'subscription_data[metadata][email_normalized]': emailNorm.ok
        ? emailNorm.value
        : '',

      billing_address_collection: 'required',
      'tax_id_collection[enabled]': 'true',
      'tax_id_collection[required]': 'if_supported',

      allow_promotion_codes: 'true',

      'custom_text[submit][message]':
        'Empieza tu prueba gratuita de 10 días. No se solicita tarjeta. Al finalizar el periodo, el acceso terminará salvo que actives una suscripción.',

      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancel`
    };

    if (process.env.STRIPE_AUTOMATIC_TAX === 'true') {
      form['automatic_tax[enabled]'] = 'true';
    }

    if (existingSubscription?.stripe_customer_id) {
      form.customer = existingSubscription.stripe_customer_id;
      form['customer_update[name]'] = 'auto';
      form['customer_update[address]'] = 'auto';
    } else if (user.email) {
      form.customer_email = user.email;
    }

    const session = await stripeRequest('/checkout/sessions', {
      method: 'POST',
      form
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout-session] error:', err);

    return res.status(500).json({
      error: 'No se pudo crear la sesión de pago',
      detail: process.env.NODE_ENV !== 'production'
        ? err.message
        : undefined
    });
  }
}
