import {
  getBearerToken,
  getPublicAppUrl,
  getSubscriptionByUserId,
  sendMethodNotAllowed,
  stripeRequest,
  validateSupabaseUser
} from './_billing.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendMethodNotAllowed(res, 'POST');

  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    const user = await validateSupabaseUser(token);
    if (!user?.id) return res.status(401).json({ error: 'Sesion invalida' });

    const subscription = await getSubscriptionByUserId(user.id);
    if (!subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'No existe cliente de Stripe para este usuario' });
    }

    const session = await stripeRequest('/billing_portal/sessions', {
      method: 'POST',
      form: {
        customer: subscription.stripe_customer_id,
        return_url: `${getPublicAppUrl()}/`
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-portal-session] error:', err);
    return res.status(500).json({ error: 'No se pudo crear la sesion del portal' });
  }
}
