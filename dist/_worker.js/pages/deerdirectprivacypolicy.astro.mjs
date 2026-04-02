globalThis.process ??= {}; globalThis.process.env ??= {};
import { f as createComponent, o as renderComponent, r as renderTemplate } from '../chunks/astro/server_DD7PPlaL.mjs';
import { M as MarkdownDocument } from '../chunks/markdown-document_BM5tkbtW.mjs';
import { $ as $$BaseLayout } from '../chunks/base-layout_DCBNRhKN.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_C0jZesLU.mjs';

const $$Deerdirectprivacypolicy = createComponent(($$result, $$props, $$slots) => {
  const markdownContent = `# Privacy Policy for Deer Direct - Bluesky to Deer Redirect

**Effective Date:** 9/11/2025

## Overview

Deer Direct is a Chrome browser extension that automatically redirects Bluesky (bsky.app) links to Deer Social (deer.social). This privacy policy explains how the extension handles your data.

## Data Collection

**We do not collect, store, or transmit any personal data.**

This extension operates entirely locally within your browser and performs the following functions:

- Redirects bsky.app URLs to deer.social URLs
- Does not access, read, or store any content from the websites you visit
- Does not collect any personal information, browsing history, or user data
- Does not communicate with any external servers or services

## How the Extension Works

The extension uses Chrome's declarative net request API to:

1. Detect when you navigate to bsky.app URLs
2. Automatically redirect those requests to the equivalent deer.social URLs
3. Perform all redirection locally within your browser

## Permissions Used

- **declarativeNetRequest**: Required to perform URL redirections
- **Host permission for bsky.app**: Required to detect and redirect bsky.app URLs

## Data Storage

No data is stored locally or remotely. The extension does not use any storage mechanisms.

## Third-Party Services

This extension does not integrate with any third-party services or send data to external servers.

## Updates to This Policy

We may update this privacy policy from time to time. Any changes will be posted on this page with an updated effective date.

## Contact

If you have any questions about this privacy policy or the extension, please contact us at [matt@mmatt.net](mailto:matt@mmatt.net).

## Compliance

This extension complies with Chrome Web Store policies and applicable privacy regulations by:

- Not collecting any personal data
- Operating transparently with minimal permissions
- Providing clear functionality descriptions
- Maintaining user privacy through local-only processing

---

_This privacy policy is effective as of the date listed above and applies to all users of the Deer Direct extension._
`;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "DeerDirect Privacy Policy \u2014 mmatt.net", "description": "Privacy policy for the DeerDirect app and related services.", "canonical": "/deerdirectprivacypolicy" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "MarkdownDocument", MarkdownDocument, { "title": "DeerDirect Privacy Policy", "content": markdownContent })} ` })}`;
}, "/Users/matt/dev/mmattbtw/website/src/pages/deerdirectprivacypolicy.astro", void 0);

const $$file = "/Users/matt/dev/mmattbtw/website/src/pages/deerdirectprivacypolicy.astro";
const $$url = "/deerdirectprivacypolicy";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Deerdirectprivacypolicy,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
