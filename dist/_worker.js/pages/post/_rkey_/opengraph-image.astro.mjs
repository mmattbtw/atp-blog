globalThis.process ??= {}; globalThis.process.env ??= {};
import { a as getPost } from '../../../chunks/api_yjVozGB8.mjs';
import { r as renderOgImage } from '../../../chunks/og_CA2bygqb.mjs';
import { g as getPostTitle } from '../../../chunks/posts_717GVBFl.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_C0jZesLU.mjs';

const GET = async ({ params, request }) => {
  const post = await getPost(params.rkey ?? "");
  return renderOgImage({
    requestUrl: request.url,
    title: getPostTitle(post),
    subtitle: "mmatt.net",
    backgroundPath: "/blogbg.png",
    textSize: 80
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
