globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as renderOgImage } from '../chunks/og_CA2bygqb.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_C0jZesLU.mjs';

const GET = async ({ request }) => renderOgImage({
  requestUrl: request.url,
  title: "mmatt.net",
  subtitle: "",
  backgroundPath: "/indexbg.png",
  textSize: 96
});

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
