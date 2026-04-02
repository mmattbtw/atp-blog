globalThis.process ??= {}; globalThis.process.env ??= {};
import { w as withEdgeCache } from '../../chunks/http-cache_Cg0uAByA.mjs';
import { f as fetchLetterboxdEntries } from '../../chunks/letterboxd_Dg117nCX.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_C0jZesLU.mjs';

const GET = async ({ request }) => withEdgeCache(request, "letterboxd-rss", 3600, async () => {
  try {
    return Response.json({
      entries: await fetchLetterboxdEntries()
    });
  } catch (error) {
    console.error("Error fetching Letterboxd RSS:", error);
    return Response.json(
      { error: "Failed to fetch Letterboxd RSS" },
      { status: 500 }
    );
  }
});

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
