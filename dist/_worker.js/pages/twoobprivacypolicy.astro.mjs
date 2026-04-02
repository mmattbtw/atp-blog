globalThis.process ??= {}; globalThis.process.env ??= {};
import { f as createComponent, o as renderComponent, r as renderTemplate } from '../chunks/astro/server_DD7PPlaL.mjs';
import { M as MarkdownDocument } from '../chunks/markdown-document_BM5tkbtW.mjs';
import { $ as $$BaseLayout } from '../chunks/base-layout_DCBNRhKN.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_C0jZesLU.mjs';

const $$Twoobprivacypolicy = createComponent(($$result, $$props, $$slots) => {
  const markdownContent = `# Privacy Policy

**Last updated:** February 5, 2026

## Overview
Twoob is a browser extension that adds a Twitch chat tab alongside YouTube Live chat on YouTube watch pages. This policy explains what data is handled and why.

## Data We Collect
Twoob does not collect, transmit, or sell personal data. The extension does not use analytics or tracking.

## Data Stored Locally
The extension stores the Twitch channel you enter for a given YouTube video so it can load the correct chat tab the next time you visit that video. This data is stored locally in your browser using \`chrome.storage.local\` and is not sent anywhere.

## Host Permissions
The extension needs access to the following hosts to function:
- \`https://www.youtube.com/*\` to inject the content script and render the tabs on YouTube watch pages.
- \`https://www.twitch.tv/*\` and \`https://player.twitch.tv/*\` to embed and load Twitch chat within the extension UI.

## Remote Code
Twoob does not use remote code. All JavaScript and CSS are bundled within the extension package. No external scripts, modules, or eval\u2019d code are used.

## Changes
If this policy changes, the updated version will be posted in this file.

## Contact
If you have questions about this policy, contact matt (@) mmatt.net 
`;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Twoob Privacy Policy \u2014 mmatt.net", "description": "Privacy policy for the Twoob app and related services.", "canonical": "/twoobprivacypolicy" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "MarkdownDocument", MarkdownDocument, { "title": "Twoob Privacy Policy", "content": markdownContent })} ` })}`;
}, "/Users/matt/dev/mmattbtw/website/src/pages/twoobprivacypolicy.astro", void 0);

const $$file = "/Users/matt/dev/mmattbtw/website/src/pages/twoobprivacypolicy.astro";
const $$url = "/twoobprivacypolicy";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Twoobprivacypolicy,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
