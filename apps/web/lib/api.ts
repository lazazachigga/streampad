// apps/web/lib/api.ts
const BASE = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const endpoints = {
  health: () => api<{ status: string }>('/health'),
  metrics: () => api('/metrics'),
  tokens: () => api<{ tokens: unknown[] }>('/tokens'),
  token: (mint: string) => api(`/tokens/${mint}`),
  launch: (body: unknown) => api('/tokens/launch', { method: 'POST', body: JSON.stringify(body) }),
  meFees: () => api('/me/fees'),
  claimAttestation: (body: unknown) => api('/me/claim/attestation', { method: 'POST', body: JSON.stringify(body) }),
  transparency: () => api('/transparency'),
  provisionWallet: (identity: string) => api('/wallet/provision', { method: 'POST', body: JSON.stringify({ identity }) }),
};
