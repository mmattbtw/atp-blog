export function getCacheHeaders(ttlSeconds = 3600) {
  return {
    "Cache-Control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`,
  };
}

function buildCacheKey(request: Request, key: string) {
  const url = new URL(request.url);
  url.pathname = `/_cache/${encodeURIComponent(key)}`;
  url.search = "";
  return new Request(url.toString(), { method: "GET" });
}

export async function withEdgeCache(
  request: Request,
  key: string,
  ttlSeconds: number,
  createResponse: () => Promise<Response>,
) {
  if (typeof caches === "undefined") {
    return createResponse();
  }

  const cache =
    "default" in caches
      ? (caches as CacheStorage & { default: Cache }).default
      : await caches.open("mmatt");
  const cacheKey = buildCacheKey(request, key);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await createResponse();
  if (!response.ok || response.headers.has("Set-Cookie")) {
    return response;
  }

  const cachedResponse = new Response(response.body, response);
  Object.entries(getCacheHeaders(ttlSeconds)).forEach(([name, value]) => {
    cachedResponse.headers.set(name, value);
  });

  await cache.put(cacheKey, cachedResponse.clone());
  return cachedResponse;
}

export async function purgeEdgeCache(request: Request, keys: string[]) {
  if (typeof caches === "undefined") {
    return;
  }

  const cache =
    "default" in caches
      ? (caches as CacheStorage & { default: Cache }).default
      : await caches.open("mmatt");
  await Promise.all(keys.map((key) => cache.delete(buildCacheKey(request, key))));
}
