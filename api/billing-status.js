import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  getBearerToken,
  getSubscriptionByUserId,
  sendMethodNotAllowed,
  validateSupabaseUser
} from './_billing.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendMethodNotAllowed(res, 'GET');

  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    const user = await validateSupabaseUser(token);
    if (!user?.id) return res.status(401).json({ error: 'Sesion invalida' });

    const subscription = await getSubscriptionByUserId(user.id);
    const status = subscription?.status || 'inactive';

    return res.status(200).json({
      active: ACTIVE_SUBSCRIPTION_STATUSES.has(status),
      status,
      current_period_end: subscription?.current_period_end || null,
      cancel_at_period_end: !!subscription?.cancel_at_period_end
    });
  } catch (err) {
    console.error('[billing-status] error:', err);
    return res.status(500).json({ error: 'No se pudo comprobar la suscripcion' });
  }
}
