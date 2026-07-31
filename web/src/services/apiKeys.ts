import { queryOptions } from "@tanstack/react-query";
import { apiKeys } from "@/mocks/data";
import { respond } from "./client";

export function listApiKeys() {
  return respond(apiKeys);
}

export function getApiKey(id: string) {
  return respond(apiKeys.find((k) => k.id === id));
}

export function createApiKey(input: { name: string; environment: string; scopes: string[] }) {
  const suffix = Math.random().toString(36).slice(2, 6);
  const env = input.environment === "production" ? "live" : "test";
  const secret = `vs_${env}_${suffix}${Math.random().toString(36).slice(2, 18)}`;
  return respond({
    id: `key_${Date.now().toString(36)}`,
    name: input.name,
    prefix: secret.slice(0, 12),
    key: secret,
  });
}

export const apiKeysQueryOptions = () =>
  queryOptions({ queryKey: ["api-keys"], queryFn: listApiKeys });

export const apiKeyQueryOptions = (id: string) =>
  queryOptions({ queryKey: ["api-keys", id], queryFn: () => getApiKey(id) });
