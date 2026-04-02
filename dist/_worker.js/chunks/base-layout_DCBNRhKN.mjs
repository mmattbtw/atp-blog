globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createAstro, f as createComponent, r as renderTemplate, G as renderSlot, H as renderHead, h as addAttribute } from './astro/server_DD7PPlaL.mjs';
/* empty css                       */

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro("https://mmatt.net");
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$BaseLayout;
  const {
    title = "mmatt.net",
    description = "<_< ^_^ >_>",
    canonical,
    image
  } = Astro2.props;
  const canonicalUrl = canonical ? new URL(canonical, Astro2.site ?? Astro2.url).toString() : void 0;
  const imageUrl = image ? new URL(image, Astro2.site ?? Astro2.url).toString() : void 0;
  return renderTemplate(_a || (_a = __template(['<html lang="en"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#BEFCFF"><meta name="description"', '><meta name="fediverse:creator" content="@matt@social.lol"><meta property="og:title"', '><meta property="og:description"', '><meta property="og:type" content="website"><meta property="og:site_name" content="mmatt.net">', "", '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title"', '><meta name="twitter:description"', ">", "", '<link rel="alternate" type="application/rss+xml" href="/rss"><link rel="icon" href="/favicon.ico"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:wght@400&display=swap" rel="stylesheet"><script defer data-domain="mmatt.net" data-api="https://plausible.mmatt.net/api/event" src="https://plausible.mmatt.net/js/script.outbound-links.js"><\/script>', "<title>", "</title>", '</head> <body class="antialiased font-sans"> ', " </body></html>"])), addAttribute(description, "content"), addAttribute(title, "content"), addAttribute(description, "content"), canonicalUrl && renderTemplate`<meta property="og:url"${addAttribute(canonicalUrl, "content")}>`, imageUrl && renderTemplate`<meta property="og:image"${addAttribute(imageUrl, "content")}>`, addAttribute(title, "content"), addAttribute(description, "content"), imageUrl && renderTemplate`<meta name="twitter:image"${addAttribute(imageUrl, "content")}>`, canonicalUrl && renderTemplate`<link rel="canonical"${addAttribute(canonicalUrl, "href")}>`, renderSlot($$result, $$slots["head"]), title, renderHead(), renderSlot($$result, $$slots["default"]));
}, "/Users/matt/dev/mmattbtw/website/src/layouts/base-layout.astro", void 0);

export { $$BaseLayout as $ };
