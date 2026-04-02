globalThis.process ??= {}; globalThis.process.env ??= {};
import { f as createComponent, m as maybeRenderHead, r as renderTemplate, o as renderComponent, h as addAttribute } from '../../chunks/astro/server_DD7PPlaL.mjs';
import { m as me } from '../../chunks/matt_DwuSQ-4B.mjs';
import { b as getStatuses } from '../../chunks/api_yjVozGB8.mjs';
import { T as Title, P as Paragraph } from '../../chunks/typography_ByiWqmcU.mjs';
import { L as Link } from '../../chunks/link_Bst9bL4O.mjs';
import { $ as $$BaseLayout } from '../../chunks/base-layout_DCBNRhKN.mjs';
import { A as ArrowLeft } from '../../chunks/arrow-left_B_vt9L13.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_C0jZesLU.mjs';

const $$NowList = createComponent(async ($$result, $$props, $$slots) => {
  const posts = await getStatuses();
  const sortedPosts = posts.sort(
    (a, b) => new Date(b.value.createdAt ?? 0).getTime() - new Date(a.value.createdAt ?? 0).getTime()
  );
  return renderTemplate`${sortedPosts.map((record) => {
    const post = record.value;
    return renderTemplate`${maybeRenderHead()}<div class="flex flex-row justify-between items-center"><div><p class="text-pretty">${post.text}</p><p class="text-xs text-gray-500">${new Date(post.createdAt).toLocaleString()}</p></div>${post.emoji && renderTemplate`<p class="text-5xl">${post.emoji}</p>`}</div>`;
  })}`;
}, "/Users/matt/dev/mmattbtw/website/src/components/NowList.astro", void 0);

const $$Now = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Right Now - mmatt.net", "description": "its- its like its like. <_< ^_^ >_>", "canonical": "/right/now" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-dvh p-8 pb-20 gap-16 sm:p-20"> <main class="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-[600px]"> <a href="/" class="hover:underline hover:underline-offset-4 font-medium"> ${renderComponent($$result2, "ArrowLeftIcon", ArrowLeft, { "className": "inline size-4 align-middle mb-px mr-1" })}
Back
</a> <div class="self-center flex flex-col"> <img${addAttribute(me.src, "src")} alt="Photo of Matt Morris, red hair, glasses, holding his iPhone in the mirror, taking a picture of himself." width="100" height="100" class="rounded-lg"> </div> ${renderComponent($$result2, "Title", Title, { "level": "h2" }, { "default": ($$result3) => renderTemplate`matt: right now` })} ${renderComponent($$result2, "Paragraph", Paragraph, {}, { "default": ($$result3) => renderTemplate`
view on${" "}${renderComponent($$result3, "Link", Link, { "href": "https://bsky.app/profile/did:plc:rwb72l7iwkraojrbrbwitnkd" }, { "default": ($$result4) => renderTemplate`
Bluesky
` })}${" "}
and ${renderComponent($$result3, "Link", Link, { "href": "https://status.lol/matt" }, { "default": ($$result4) => renderTemplate`status.lol` })}.
` })} <div class="flex flex-col gap-4 w-full"> ${renderComponent($$result2, "NowList", $$NowList, {})} </div> </main> </div> ` })}`;
}, "/Users/matt/dev/mmattbtw/website/src/pages/right/now.astro", void 0);

const $$file = "/Users/matt/dev/mmattbtw/website/src/pages/right/now.astro";
const $$url = "/right/now";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Now,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
