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

    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({ error: 'Server configuration error: missing STRIPE_PRICE_ID' });
    }

    const existingSubscription = await getSubscriptionByUserId(user.id);
    const appUrl = getPublicAppUrl();
    const form = {
      mode: 'subscription',
      client_reference_id: user.id,
      'line_items[0][price]': process.env.STRIPE_PRICE_ID,
      'line_items[0][quantity]': 1,
      'metadata[supabase_user_id]': user.id,
      'subscription_data[metadata][supabase_user_id]': user.id,
      billing_address_collection: 'required',
      'tax_id_collection[enabled]': true,
      'tax_id_collection[required]': 'if_supported',
      'phone_number_collection[enabled]': true,
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancel`
    };

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
    return res.status(500).json({ error: 'No se pudo crear la sesion de pago' });
  }
}
