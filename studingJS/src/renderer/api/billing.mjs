import { apiFetch } from './client.mjs';

/** Returns billing status: plan, subscription info, whether Stripe is configured. */
export async function getBillingStatus() {
  try {
    const res = await apiFetch('/billing/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Creates a Stripe Checkout session and opens it in the browser. */
export async function startCheckout() {
  const res = await apiFetch('/billing/checkout', { method: 'POST' });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.code || 'Не удалось создать сессию оплаты');
  }

  if (data.url) {
    window.appApi.openExternal(data.url);
  }
}

/** Opens Stripe Customer Portal in browser (cancel/change subscription). */
export async function openBillingPortal() {
  const res = await apiFetch('/billing/portal', { method: 'POST' });
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || 'Не удалось открыть портал');

  if (data.url) {
    window.appApi.openExternal(data.url);
  }
}
