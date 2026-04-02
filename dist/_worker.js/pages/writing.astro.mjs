globalThis.process ??= {}; globalThis.process.env ??= {};
import { f as createComponent, m as maybeRenderHead, o as renderComponent, r as renderTemplate, e as createAstro } from '../chunks/astro/server_DD7PPlaL.mjs';
import { d as getPosts } from '../chunks/api_yjVozGB8.mjs';
import { j as jsxRuntimeExports } from '../chunks/jsx-runtime_DoH26EBh.mjs';
import { L as Link } from '../chunks/link_Bst9bL4O.mjs';
import { B as BlogVideoBackground } from '../chunks/home-video-background_BeXs5aOd.mjs';
import { $ as $$BaseLayout } from '../chunks/base-layout_DCBNRhKN.mjs';
import { g as getCacheHeaders } from '../chunks/http-cache_Cg0uAByA.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_C0jZesLU.mjs';

function PostListItem({
  post,
  rkey
}) {
  const title = post.title;
  const createdAt = post.createdAt;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { href: `/post/${rkey}`, children: [
    new Date(createdAt ?? "").toLocaleDateString(),
    " - ",
    title
  ] });
}

const $$PostList = createComponent(async ($$result, $$props, $$slots) => {
  const posts = await getPosts();
  return renderTemplate`${maybeRenderHead()}<div class="flex flex-col"> ${posts.map((post) => renderTemplate`${renderComponent($$result, "PostListItem", PostListItem, { "post": post, "rkey": post.rkey })}`)} </div>`;
}, "/Users/matt/dev/mmattbtw/website/src/components/PostList.astro", void 0);

const $$Astro = createAstro("https://mmatt.net");
const $$Writing = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Writing;
  Object.entries(getCacheHeaders()).forEach(
    ([name, value]) => Astro2.response.headers.set(name, value)
  );
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "writing - mmatt.net", "description": "<_< ^_^ >_>", "canonical": "/writing" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="relative min-h-screen overflow-hidden"> ${renderComponent($$result2, "BlogVideoBackground", BlogVideoBackground, { "client:load": true, "client:component-hydration": "load", "client:component-path": "#/components/home-video-background", "client:component-export": "BlogVideoBackground" })} <div class="absolute inset-0 z-10 min-h-screen"> <div class="max-w-148 pt-1.5 pl-1.5 space-y-4"> <h1 class="font-bold text-black dark:text-white bg-white dark:bg-black inline">
(;;;*_*) writing
</h1> ${renderComponent($$result2, "PostList", $$PostList, {})} </div> </div> </main> ` })}`;
}, "/Users/matt/dev/mmattbtw/website/src/pages/writing.astro", void 0);

const $$file = "/Users/matt/dev/mmattbtw/website/src/pages/writing.astro";
const $$url = "/writing";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Writing,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
