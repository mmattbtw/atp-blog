globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createAstro, f as createComponent } from '../chunks/astro/server_DD7PPlaL.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_C0jZesLU.mjs';

const $$Astro = createAstro("https://mmatt.net");
const $$Gglb = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Gglb;
  return Astro2.redirect(
    "https://docs.google.com/spreadsheets/d/1yuRxzvOG0_wNut_5KY0fIoef2nQwYWUQBVmO8jQ_iTo/edit?usp=sharing"
  );
}, "/Users/matt/dev/mmattbtw/website/src/pages/gglb.astro", void 0);

const $$file = "/Users/matt/dev/mmattbtw/website/src/pages/gglb.astro";
const $$url = "/gglb";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Gglb,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
