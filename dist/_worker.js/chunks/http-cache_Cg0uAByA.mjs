globalThis.process ??= {}; globalThis.process.env ??= {};
function getCacheHeaders(ttlSeconds = 3600) {
  return {
    "Cache-Control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`
  };
}
function buildCacheKey(request, key) {
  const url = new URL(request.url);
  url.pathname = `/_cache/${key}`;
  url.search = "";
  return new Request(url.toString(), { method: "GET" });
}
async function withEdgeCache(request, key, ttlSeconds, createResponse) {
  if (typeof caches === "undefined") {
    return createResponse();
  }
  const cache = "default" in caches ? caches.default : await caches.open("mmatt");
  const cacheKey = buildCacheKey(request, key);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }
  const response = await createResponse();
  const cachedResponse = new Response(response.body, response);
  Object.entries(getCacheHeaders(ttlSeconds)).forEach(([name, value]) => {
    cachedResponse.headers.set(name, value);
  });
  await cache.put(cacheKey, cachedResponse.clone());
  return cachedResponse;
}
async function purgeEdgeCache(request, keys) {
  if (typeof caches === "undefined") {
    return;
  }
  const cache = "default" in caches ? caches.default : await caches.open("mmatt");
  await Promise.all(keys.map((key) => cache.delete(buildCacheKey(request, key))));
}

export { getCacheHeaders as g, purgeEdgeCache as p, withEdgeCache as w };
