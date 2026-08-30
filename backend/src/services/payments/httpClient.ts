export interface HttpJsonClient {
  postJson(
    url: string,
    body: unknown,
    options?: { timeoutMs?: number },
  ): Promise<{ status: number; data: unknown }>;
}

/**
 * Minimal fetch-based JSON client with timeout.
 * Injectable so Zarinpal tests never hit the network.
 */
export function createFetchJsonClient(
  fetchImpl: typeof fetch = fetch,
): HttpJsonClient {
  return {
    async postJson(url, body, options) {
      const timeoutMs = options?.timeoutMs ?? 15_000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'user-agent': 'Luxora-Commerce/1.0',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        const text = await response.text();
        let data: unknown = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = { raw: text };
        }
        return { status: response.status, data };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
