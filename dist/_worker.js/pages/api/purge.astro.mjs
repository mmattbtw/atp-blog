globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as readEnvFromLocals, c as clearApiCache } from '../../chunks/api_yjVozGB8.mjs';
import { p as purgeEdgeCache } from '../../chunks/http-cache_Cg0uAByA.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_C0jZesLU.mjs';

const POST = async ({ request, redirect, locals }) => {
  const formData = await request.formData();
  const password = formData.get("password");
  const rkey = formData.get("rkey")?.toString();
  const env = readEnvFromLocals(locals);
  if (password !== env.PURGE_PASSWORD) {
    return redirect(rkey ? `/post/${rkey}/purge?error=yeah` : "/purge?error=yeah");
  }
  const keys = ["rss", "letterboxd-rss"];
  if (rkey) {
    keys.push(`post-${rkey}`);
  } else {
    keys.push("home", "writing");
  }
  clearApiCache();
  await purgeEdgeCache(request, keys);
  return redirect(rkey ? `/post/${rkey}` : "/");
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
