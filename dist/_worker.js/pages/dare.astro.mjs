globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createAstro, f as createComponent } from '../chunks/astro/server_DD7PPlaL.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_C0jZesLU.mjs';

const $$Astro = createAstro("https://mmatt.net");
const $$Dare = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Dare;
  return Astro2.redirect(
    "https://drive.google.com/file/d/1hHmM8-W3UGOW59W0yxuTkmVP2iBYiSyD/view?usp=sharing"
  );
}, "/Users/matt/dev/mmattbtw/website/src/pages/dare.astro", void 0);

const $$file = "/Users/matt/dev/mmattbtw/website/src/pages/dare.astro";
const $$url = "/dare";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dare,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
