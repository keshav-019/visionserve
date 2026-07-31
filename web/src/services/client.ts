// Base URL of the visionserve_api backend (see apps/api_server). Every route in this app
// currently reads from the mocks below rather than this URL — real endpoints get wired in
// one at a time as the backend grows past /health, /ready, /version (see roadmap Phase 4+).
// Set VITE_API_URL in web/.env.local for local development against a real backend, or as a
// Vercel project environment variable pointing at the Railway deployment URL.
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8081";

/** Shared mock transport: simulates network latency and returns deep clones. */
export const MOCK_LATENCY = { min: 120, max: 420 };

export function delay(ms?: number): Promise<void> {
  const wait = ms ?? MOCK_LATENCY.min + Math.random() * (MOCK_LATENCY.max - MOCK_LATENCY.min);
  return new Promise((resolve) => setTimeout(resolve, wait));
}

export async function respond<T>(data: T, ms?: number): Promise<T> {
  await delay(ms);
  return structuredClone(data);
}
