globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createAstro, f as createComponent, o as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DD7PPlaL.mjs';
import { $ as $$BaseLayout } from '../chunks/base-layout_DCBNRhKN.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_C0jZesLU.mjs';

const $$Astro = createAstro("https://mmatt.net");
const $$Purge = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Purge;
  const error = Astro2.url.searchParams.get("error");
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Purge - mmatt.net", "description": "cache purge", "canonical": "/purge" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<form action="/api/purge" method="post" class="flex flex-col gap-4 p-2 mt-24 mx-auto max-w-96"> <input type="password" name="password" placeholder="Password" class="p-2 border rounded-xs"> ${error && renderTemplate`<p class="text-red-500">wrong password mate</p>`} <button type="submit" class="p-2 border rounded-xs">Purge</button> </form> ` })}`;
}, "/Users/matt/dev/mmattbtw/website/src/pages/purge.astro", void 0);

const $$file = "/Users/matt/dev/mmattbtw/website/src/pages/purge.astro";
const $$url = "/purge";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Purge,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
