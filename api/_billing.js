const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yritadgaurvplltgubii.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLIC_API_KEY = process.env.SUPABASE_ANON_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || 'sb_publishable_ddx-9W2ZbYubGUlqx7TRig_AqS6rftm';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_API_BASE = 'https://api.stripe.com/v1';

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
export const FREE_TRIAL_DAYS = 10;
export const FREE_TRIAL_LAUNCH_AT = '2026-07-02T00:00:00.000Z';

export function hasFreeAccountTrial(user, now = Date.now()) {
  const createdAt = Date.parse(user?.created_at || '');
  if (!Number.isFinite(createdAt)) return false;

  const launchAt = Date.parse(process.env.FREE_TRIAL_LAUNCH_AT || FREE_TRIAL_LAUNCH_AT);
  const trialStartedAt = Number.isFinite(launchAt)
    ? Math.max(createdAt, launchAt)
    : createdAt;
  const trialDuration = FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return now >= trialStartedAt && now < trialStartedAt + trialDuration;
}

export function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
}

export function getPublicAppUrl() {
  return String(process.env.PUBLIC_APP_URL || 'https://apps.tumentorpsicologia.com').replace(/\/+$/, '');
}

export function assertServerBillingConfig({ requireStripe = false } = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase service role environment variables');
  }

  if (requireStripe && !STRIPE_SECRET_KEY) {
    throw new Error('Missing Stripe secret key');
  }
}

export async function validateSupabaseUser(token) {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_API_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  const baseUrl = String(SUPABASE_URL).replace(/\/+$/, '');
  const authRes = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_PUBLIC_API_KEY
    }
  });

  if (!authRes.ok) return null;
  return authRes.json();
}

async function supabaseRest(path, options = {}) {
  assertServerBillingConfig();

  const baseUrl = String(SUPABASE_URL).replace(/\/+$/, '');
  const headers = new Headers(options.headers || {});
  headers.set('apikey', SUPABASE_SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase REST error ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function getSubscriptionByUserId(userId) {
  const rows = await supabaseRest(
    `user_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=*`,
    { headers: { Accept: 'application/json' } }
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function getSubscriptionByCustomerId(customerId) {
  const rows = await supabaseRest(
    `user_subscriptions?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=*`,
    { headers: { Accept: 'application/json' } }
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function upsertSubscription(row) {
  const rows = await supabaseRest('user_subscriptions?on_conflict=user_id', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      ...row,
      updated_at: new Date().toISOString()
    })
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function hasActiveSubscription(userId) {
  const row = await getSubscriptionByUserId(userId);
  return !!row && ACTIVE_SUBSCRIPTION_STATUSES.has(row.status);
}

export async function hasPrivateDataAccess(user) {
  if (!user?.id) return false;
  if (hasFreeAccountTrial(user)) return true;
  return hasActiveSubscription(user.id);
}

export async function stripeRequest(path, {
  method = 'GET',
  form,
  query
} = {}) {
  assertServerBillingConfig({ requireStripe: true });

  const url = new URL(`${STRIPE_API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
  }

  const headers = {
    Authorization: `Bearer ${STRIPE_SECRET_KEY}`
  };

  let body;
  if (form) {
    const params = new URLSearchParams();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.append(key, String(value));
    });
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = params;
  }

  const response = await fetch(url, {
    method,
    headers,
    body
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe error ${response.status}`);
  }

  return data;
}

export function subscriptionToRow(subscription, userId) {
  const firstItem = subscription?.items?.data?.[0];
  const priceId = firstItem?.price?.id || subscription?.plan?.id || null;
  const periodEnd = subscription?.current_period_end || firstItem?.current_period_end || null;
  const customerId = typeof subscription?.customer === 'string'
    ? subscription.customer
    : subscription?.customer?.id || null;

  return {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription?.id || null,
    stripe_price_id: priceId,
    status: subscription?.status || 'inactive',
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!subscription?.cancel_at_period_end
  };
}

export function sendMethodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed);
  return res.status(405).json({ error: 'Method not allowed' });
}
