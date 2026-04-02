globalThis.process ??= {}; globalThis.process.env ??= {};
import { l as getDefaultExportFromCjs, e as createAstro, f as createComponent, o as renderComponent, p as Fragment, r as renderTemplate, h as addAttribute, m as maybeRenderHead } from '../../chunks/astro/server_DD7PPlaL.mjs';
import require$$1 from 'stream';
import require$$2 from 'util';
import { m as me } from '../../chunks/matt_DwuSQ-4B.mjs';
import { r as readEnvFromLocals, a as getPost } from '../../chunks/api_yjVozGB8.mjs';
import { c as createLucideIcon, A as ArrowLeft } from '../../chunks/arrow-left_B_vt9L13.mjs';
import { j as jsxRuntimeExports } from '../../chunks/jsx-runtime_DoH26EBh.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_C0jZesLU.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_C0jZesLU.mjs';
import { P as Paragraph, T as Title, C as Code } from '../../chunks/typography_ByiWqmcU.mjs';
import { M as Markdown, r as rehypeRaw, a as rehypeSanitize, d as defaultSchema, b as remarkGfm } from '../../chunks/index_Co1PLFGp.mjs';
import { $ as $$BaseLayout } from '../../chunks/base-layout_DCBNRhKN.mjs';
import { g as getCacheHeaders } from '../../chunks/http-cache_Cg0uAByA.mjs';
import { g as getPostTitle, a as getPostDescription, b as getPostContent, c as getPostCreatedAt } from '../../chunks/posts_717GVBFl.mjs';

/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$2 = [
  ["path", { d: "M12 6v6l4 2", key: "mmk7yg" }],
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
];
const Clock = createLucideIcon("clock", __iconNode$2);

/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode$1 = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Eye = createLucideIcon("eye", __iconNode$1);

/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */


const __iconNode = [
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M12 2v4", key: "3427ic" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["rect", { width: "16", height: "18", x: "4", y: "4", rx: "2", key: "1u9h20" }],
  ["path", { d: "M8 10h6", key: "3oa6kw" }],
  ["path", { d: "M8 14h8", key: "1fgep2" }],
  ["path", { d: "M8 18h5", key: "17enja" }]
];
const NotepadText = createLucideIcon("notepad-text", __iconNode);

var readingTime$1 = {exports: {}};

/*!
 * reading-time
 * Copyright (c) Nicolas Gryman <ngryman@gmail.com>
 * MIT Licensed
 */

var readingTime_1;
var hasRequiredReadingTime$1;

function requireReadingTime$1 () {
	if (hasRequiredReadingTime$1) return readingTime_1;
	hasRequiredReadingTime$1 = 1;

	/**
	 * @typedef {import('reading-time').Options['wordBound']} WordBoundFunction
	 */

	/**
	 * @param {number} number
	 * @param {number[][]} arrayOfRanges
	 */
	function codeIsInRanges(number, arrayOfRanges) {
	  return arrayOfRanges.some(([lowerBound, upperBound]) =>
	    (lowerBound <= number) && (number <= upperBound)
	  )
	}

	/**
	 * @type {WordBoundFunction}
	 */
	function isCJK(c) {
	  if ('string' !== typeof c) {
	    return false
	  }
	  const charCode = c.charCodeAt(0);
	  // Help wanted!
	  // This should be good for most cases, but if you find it unsatisfactory
	  // (e.g. some other language where each character should be standalone words),
	  // contributions welcome!
	  return codeIsInRanges(
	    charCode,
	    [
	      // Hiragana (Katakana not included on purpose,
	      // context: https://github.com/ngryman/reading-time/pull/35#issuecomment-853364526)
	      // If you think Katakana should be included and have solid reasons, improvement is welcomed
	      [0x3040, 0x309f],
	      // CJK Unified ideographs
	      [0x4e00, 0x9fff],
	      // Hangul
	      [0xac00, 0xd7a3],
	      // CJK extensions
	      [0x20000, 0x2ebe0]
	    ]
	  )
	}

	/**
	 * @type {WordBoundFunction}
	 */
	function isAnsiWordBound(c) {
	  return ' \n\r\t'.includes(c)
	}

	/**
	 * @type {WordBoundFunction}
	 */
	function isPunctuation(c) {
	  if ('string' !== typeof c) {
	    return false
	  }
	  const charCode = c.charCodeAt(0);
	  return codeIsInRanges(
	    charCode,
	    [
	      [0x21, 0x2f],
	      [0x3a, 0x40],
	      [0x5b, 0x60],
	      [0x7b, 0x7e],
	      // CJK Symbols and Punctuation
	      [0x3000, 0x303f],
	      // Full-width ASCII punctuation variants
	      [0xff00, 0xffef]
	    ]
	  )
	}

	/**
	 * @type {import('reading-time').default}
	 */
	function readingTime(text, options = {}) {
	  let words = 0, start = 0, end = text.length - 1;

	  // use provided value if available
	  const wordsPerMinute = options.wordsPerMinute || 200;

	  // use provided function if available
	  const isWordBound = options.wordBound || isAnsiWordBound;

	  // fetch bounds
	  while (isWordBound(text[start])) start++;
	  while (isWordBound(text[end])) end--;

	  // Add a trailing word bound to make handling edges more convenient
	  const normalizedText = `${text}\n`;

	  // calculate the number of words
	  for (let i = start; i <= end; i++) {
	    // A CJK character is a always word;
	    // A non-word bound followed by a word bound / CJK is the end of a word.
	    if (
	      isCJK(normalizedText[i]) ||
	      (!isWordBound(normalizedText[i]) &&
	        (isWordBound(normalizedText[i + 1]) || isCJK(normalizedText[i + 1]))
	      )
	    ) {
	      words++;
	    }
	    // In case of CJK followed by punctuations, those characters have to be eaten as well
	    if (isCJK(normalizedText[i])) {
	      while (
	        i <= end &&
	        (isPunctuation(normalizedText[i + 1]) || isWordBound(normalizedText[i + 1]))
	      ) {
	        i++;
	      }
	    }
	  }

	  // reading time stats
	  const minutes = words / wordsPerMinute;
	  // Math.round used to resolve floating point funkyness
	  //   http://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html
	  const time = Math.round(minutes * 60 * 1000);
	  const displayed = Math.ceil(minutes.toFixed(2));

	  return {
	    text: displayed + ' min read',
	    minutes: minutes,
	    time: time,
	    words: words
	  }
	}

	/**
	 * Export
	 */
	readingTime_1 = readingTime;
	return readingTime_1;
}

/*!
 * reading-time
 * Copyright (c) Nicolas Gryman <ngryman@gmail.com>
 * MIT Licensed
 */

var stream;
var hasRequiredStream;

function requireStream () {
	if (hasRequiredStream) return stream;
	hasRequiredStream = 1;

	/**
	 * Module dependencies.
	 */
	const readingTime = requireReadingTime$1();
	const Transform = require$$1.Transform;
	const util = require$$2;

	/**
	 * @typedef {import('reading-time').Options} Options
	 * @typedef {import('reading-time').Options['wordBound']} WordBoundFunction
	 * @typedef {import('reading-time').readingTimeStream} ReadingTimeStream
	 * @typedef {import('stream').TransformCallback} TransformCallback
	 */

	/**
	 * @param {Options} options
	 * @returns {ReadingTimeStream}
	 */
	function ReadingTimeStream(options) {
	  // allow use without new
	  if (!(this instanceof ReadingTimeStream)) {
	    return new ReadingTimeStream(options)
	  }

	  Transform.call(this, { objectMode: true });

	  this.options = options || {};
	  this.stats = {
	    minutes: 0,
	    time: 0,
	    words: 0
	  };
	}
	util.inherits(ReadingTimeStream, Transform);

	/**
	 * @param {Buffer} chunk
	 * @param {BufferEncoding} encoding
	 * @param {TransformCallback} callback
	 */
	ReadingTimeStream.prototype._transform = function(chunk, encoding, callback) {
	  const stats = readingTime(chunk.toString(encoding), this.options);

	  this.stats.minutes += stats.minutes;
	  this.stats.time += stats.time;
	  this.stats.words += stats.words;

	  callback();
	};

	/**
	 * @param {TransformCallback} callback
	 */
	ReadingTimeStream.prototype._flush = function(callback) {
	  this.stats.text = Math.ceil(this.stats.minutes.toFixed(2)) + ' min read';

	  this.push(this.stats);
	  callback();
	};

	/**
	 * Export
	 */
	stream = ReadingTimeStream;
	return stream;
}

var hasRequiredReadingTime;

function requireReadingTime () {
	if (hasRequiredReadingTime) return readingTime$1.exports;
	hasRequiredReadingTime = 1;
	readingTime$1.exports.default = readingTime$1.exports = requireReadingTime$1();
	readingTime$1.exports.readingTimeStream = requireStream();
	return readingTime$1.exports;
}

var readingTimeExports = requireReadingTime();
const readingTime = /*@__PURE__*/getDefaultExportFromCjs(readingTimeExports);

async function fetchPageViewCount(path, env) {
  if (!env.PLAUSIBLE_API_KEY) {
    return null;
  }
  const response = await fetch(`${env.PLAUSIBLE_DOMAIN}/api/v2/query`, {
    headers: {
      Authorization: `Bearer ${env.PLAUSIBLE_API_KEY}`,
      "Content-Type": "application/json"
    },
    method: "POST",
    body: JSON.stringify({
      site_id: env.PLAUSIBLE_SITE_ID,
      metrics: ["pageviews"],
      date_range: "all",
      filters: [["is", "event:page", [path]]]
    })
  });
  const data = await response.json();
  if ("error" in data) {
    console.error(data.error);
    return null;
  }
  const pageviews = data?.results?.[0]?.metrics?.[0];
  if (typeof pageviews !== "number") {
    return null;
  }
  return pageviews;
}
function formatPageViewCount(pageviews) {
  const formatter = Intl.NumberFormat("en-GB", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  });
  return `${formatter.format(pageviews).toLocaleLowerCase()} views`;
}

const $$Astro$1 = createAstro("https://mmatt.net");
const $$ViewCount = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$ViewCount;
  const { path } = Astro2.props;
  const appEnv = readEnvFromLocals(Astro2.locals);
  const pageviews = await fetchPageViewCount(path, appEnv);
  return renderTemplate`${pageviews !== null && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result2) => renderTemplate`${" "}
&middot; ${renderComponent($$result2, "EyeIcon", Eye, { "className": "text-inherit inline size-3.5 mb-0.5" })}${" "}${formatPageViewCount(pageviews)}` })}`}`;
}, "/Users/matt/dev/mmattbtw/website/src/components/ViewCount.astro", void 0);

const EMBED_URL = "https://embed.bsky.app";
function BlueskyPostEmbed({ uri }) {
  const id = reactExports.useId();
  const [height, setHeight] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
    window.addEventListener(
      "message",
      (event) => {
        if (event.origin !== EMBED_URL) {
          return;
        }
        const iframeId = event.data.id;
        if (id !== iframeId) {
          return;
        }
        const internalHeight = event.data.height;
        if (internalHeight && typeof internalHeight === "number") {
          setHeight(internalHeight);
        }
      },
      { signal }
    );
    return () => {
      abortController.abort();
    };
  }, [id]);
  const searchParams = new URLSearchParams();
  searchParams.set("id", id);
  if (typeof window !== "undefined") {
    searchParams.set("ref_url", encodeURIComponent(window.location.href));
  }
  searchParams.set("colorMode", "system");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "mt-6 flex max-w-[600px] w-full bluesky-embed",
      "data-uri": uri,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "iframe",
        {
          className: "w-full block border-none grow",
          style: { height },
          "data-bluesky-uri": uri,
          src: `${EMBED_URL}/embed/${uri.slice("at://".length)}?${searchParams.toString()}`,
          width: "100%",
          frameBorder: "0",
          scrolling: "no"
        }
      )
    }
  );
}

function applyFacets(plaintext, facets) {
  if (!facets || facets.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: plaintext });
  }
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(plaintext);
  const sortedFacets = [...facets].sort(
    (a, b) => a.index.byteStart - b.index.byteStart
  );
  const segments = [];
  let lastEnd = 0;
  sortedFacets.forEach((facet, idx) => {
    const { byteStart, byteEnd } = facet.index;
    if (byteStart > lastEnd) {
      segments.push(decoder.decode(bytes.slice(lastEnd, byteStart)));
    }
    const facetText = decoder.decode(bytes.slice(byteStart, byteEnd));
    let element = facetText;
    for (const feature of facet.features) {
      const type = feature.$type;
      if (type === "pub.leaflet.richtext.facet#bold") {
        element = /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: element }, `bold-${idx}`);
      } else if (type === "pub.leaflet.richtext.facet#italic") {
        element = /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: element }, `italic-${idx}`);
      } else if (type === "pub.leaflet.richtext.facet#underline") {
        element = /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "underline", children: element }, `underline-${idx}`);
      } else if (type === "pub.leaflet.richtext.facet#strikethrough") {
        element = /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-through", children: element }, `strike-${idx}`);
      } else if (type === "pub.leaflet.richtext.facet#code") {
        element = /* @__PURE__ */ jsxRuntimeExports.jsx(Code, { children: element }, `code-${idx}`);
      } else if (type === "pub.leaflet.richtext.facet#highlight") {
        element = /* @__PURE__ */ jsxRuntimeExports.jsx(
          "mark",
          {
            className: "bg-yellow-200 dark:bg-yellow-800",
            children: element
          },
          `highlight-${idx}`
        );
      } else if (type === "pub.leaflet.richtext.facet#link") {
        const linkFeature = feature;
        element = /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: linkFeature.uri,
            className: "font-medium underline underline-offset-4",
            children: element
          },
          `link-${idx}`
        );
      }
    }
    segments.push(/* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: element }, `segment-${idx}`));
    lastEnd = byteEnd;
  });
  if (lastEnd < bytes.length) {
    segments.push(decoder.decode(bytes.slice(lastEnd)));
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: segments });
}
function TextBlock({ block }) {
  const content = applyFacets(block.plaintext, block.facets);
  const sizeClass = block.textSize === "large" ? "text-xl" : block.textSize === "small" ? "text-sm" : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Paragraph, { className: `leading-7 not-first:mt-6 ${sizeClass}`, children: content });
}
function HeaderBlock({ block }) {
  const level = block.level ?? 1;
  const content = applyFacets(block.plaintext, block.facets);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { level: `h${level}`, children: content });
}
function CodeBlock({ block }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-sm overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "text-sm", children: block.plaintext }) });
}
function ImageBlock({
  block,
  did
}) {
  const imageBlob = block.image;
  const rawRef = imageBlob.ref ?? imageBlob.original?.ref;
  const blobCid = imageBlob.cid ?? (typeof rawRef === "string" ? rawRef : rawRef?.$link ?? (typeof rawRef?.toString === "function" ? rawRef.toString() : "")) ?? "";
  const mimeType = imageBlob.mimeType ?? "image/jpeg";
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : mimeType === "image/gif" ? "gif" : "jpeg";
  const imageUrl = `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${blobCid}@${extension}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block mt-8 w-full aspect-video relative", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    "img",
    {
      src: imageUrl,
      alt: block.alt ?? "",
      className: "object-contain w-full h-full absolute inset-0",
      loading: "lazy"
    }
  ) });
}
function BlockquoteBlock({
  block
}) {
  const content = applyFacets(block.plaintext, block.facets);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("blockquote", { className: "mt-6 border-l-2 pl-4 italic border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400", children: content });
}
function HorizontalRuleBlock() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("hr", { className: "my-8" });
}
function BskyPostBlock({ block }) {
  const atUri = block.postRef.uri;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(BlueskyPostEmbed, { uri: atUri });
}
function ListItemContent({
  content,
  did
}) {
  const type = content.$type;
  if (type === "pub.leaflet.blocks.text") {
    const textBlock = content;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: applyFacets(textBlock.plaintext, textBlock.facets) });
  }
  if (type === "pub.leaflet.blocks.header") {
    const headerBlock = content;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: applyFacets(headerBlock.plaintext, headerBlock.facets) });
  }
  if (type === "pub.leaflet.blocks.image") {
    const imageBlock = content;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ImageBlock, { block: imageBlock, did });
  }
  return null;
}
function UnorderedListBlock({
  block,
  did
}) {
  const renderListItems = (items) => {
    return items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "leading-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemContent, { content: item.content, did }),
      item.children && item.children.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "my-2 ml-6 list-disc", children: renderListItems(item.children) })
    ] }, idx));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "my-6 ml-6 list-disc [&>ul]:my-2 [&>ol]:my-2 [&>li]:mt-2", children: renderListItems(block.children) });
}
function BlockRenderer({
  block,
  alignment,
  did
}) {
  const alignmentClass = alignment === "#textAlignCenter" ? "text-center" : alignment === "#textAlignRight" ? "text-right" : alignment === "#textAlignJustify" ? "text-justify" : "";
  const type = block.$type;
  let content = null;
  if (type === "pub.leaflet.blocks.text") {
    content = /* @__PURE__ */ jsxRuntimeExports.jsx(TextBlock, { block });
  } else if (type === "pub.leaflet.blocks.header") {
    content = /* @__PURE__ */ jsxRuntimeExports.jsx(HeaderBlock, { block });
  } else if (type === "pub.leaflet.blocks.code") {
    content = /* @__PURE__ */ jsxRuntimeExports.jsx(CodeBlock, { block });
  } else if (type === "pub.leaflet.blocks.image") {
    content = /* @__PURE__ */ jsxRuntimeExports.jsx(ImageBlock, { block, did });
  } else if (type === "pub.leaflet.blocks.blockquote") {
    content = /* @__PURE__ */ jsxRuntimeExports.jsx(BlockquoteBlock, { block });
  } else if (type === "pub.leaflet.blocks.horizontalRule") {
    content = /* @__PURE__ */ jsxRuntimeExports.jsx(HorizontalRuleBlock, {});
  } else if (type === "pub.leaflet.blocks.bskyPost") {
    content = /* @__PURE__ */ jsxRuntimeExports.jsx(BskyPostBlock, { block });
  } else if (type === "pub.leaflet.blocks.unorderedList") {
    content = /* @__PURE__ */ jsxRuntimeExports.jsx(
      UnorderedListBlock,
      {
        block,
        did
      }
    );
  } else {
    console.warn("Unknown block type:", type);
    return null;
  }
  if (alignmentClass) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: alignmentClass, children: content });
  }
  return content;
}
function LinearDocumentPage({
  page,
  did
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: page.blocks.map((blockWrapper, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    BlockRenderer,
    {
      block: blockWrapper.block,
      alignment: blockWrapper.alignment,
      did
    },
    idx
  )) });
}
function getLeafletUrl(basePath, did, rkey) {
  if (!rkey) {
    return `https://leaflet.pub/${did}`;
  }
  if (!basePath) {
    return `https://leaflet.pub/${did}/${rkey}`;
  }
  if (basePath.startsWith("http://") || basePath.startsWith("https://")) {
    const url = new URL(basePath);
    return url.pathname === "/" ? `${url.origin}/${rkey}` : url.toString();
  }
  return `https://${basePath}/${rkey}`;
}
function LeafletRenderer({
  document,
  did,
  uri,
  basePath,
  isExternal
}) {
  const rkey = uri.split("/").pop();
  const leafletUrl = getLeafletUrl(basePath, did, rkey);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "[&>.bluesky-embed]:mt-8 [&>.bluesky-embed]:mb-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground italic mb-6 bg-yellow-100/50 dark:bg-yellow-900/50 p-4 rounded-sm", children: isExternal ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      "This article was written for another publication, see the original",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: leafletUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "underline underline-offset-4 hover:text-foreground",
          children: "here"
        }
      ),
      "."
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      "This was originally written on Leaflet so it might look better over there, see the original",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: leafletUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "underline underline-offset-4 hover:text-foreground",
          children: "here"
        }
      ),
      "."
    ] }) }),
    document.pages.map((page, idx) => {
      if (page.$type === "pub.leaflet.pages.linearDocument") {
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          LinearDocumentPage,
          {
            page,
            did
          },
          idx
        );
      }
      return null;
    })
  ] });
}

function WhiteWindRenderer({ content }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "[&>.bluesky-embed]:mt-8 [&>.bluesky-embed]:mb-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    Markdown,
    {
      remarkPlugins: [remarkGfm],
      remarkRehypeOptions: { allowDangerousHtml: true },
      rehypePlugins: [
        rehypeRaw,
        [
          rehypeSanitize,
          {
            ...defaultSchema,
            attributes: {
              ...defaultSchema.attributes,
              blockquote: [
                ...defaultSchema.attributes?.blockquote ?? [],
                "dataBlueskyUri",
                "dataBlueskyCid"
              ]
            }
          }
        ]
      ],
      components: {
        h1: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { level: "h1", ...props }),
        h2: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { level: "h2", ...props }),
        h3: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { level: "h3", ...props }),
        h4: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { level: "h4", ...props }),
        h5: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { level: "h5", ...props }),
        h6: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { level: "h6", ...props }),
        p: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(Paragraph, { className: "leading-7 not-first:mt-6", ...props }),
        blockquote: (props) => "data-bluesky-uri" in props ? /* @__PURE__ */ jsxRuntimeExports.jsx(BlueskyPostEmbed, { uri: props["data-bluesky-uri"] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          "blockquote",
          {
            className: "mt-6 border-l-2 pl-4 italic border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400",
            ...props
          }
        ),
        ul: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "ul",
          {
            className: "my-6 ml-6 list-disc [&>ul]:my-2 [&>ol]:my-2 [&>li]:mt-2",
            ...props
          }
        ),
        ol: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "ol",
          {
            className: "my-6 ml-6 list-decimal [&>ul]:my-2 [&>ol]:my-2 [&>li]:mt-2",
            ...props
          }
        ),
        li: (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "leading-7", ...props }),
        code: (props) => {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          if (match) {
            return /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "mt-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-sm overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { ...rest, className: "text-sm", children: String(children).replace(/\n$/, "") }) });
          } else {
            return /* @__PURE__ */ jsxRuntimeExports.jsx(Code, { ...props });
          }
        },
        a: ({ href, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href,
            className: "font-medium underline underline-offset-4",
            ...props
          }
        ),
        img: ({ src, alt }) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block mt-8 w-full aspect-video relative", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: typeof src === "string" ? src : "",
            alt: alt ?? "",
            className: "object-contain w-full h-full absolute inset-0",
            loading: "lazy"
          }
        ) })
      },
      children: content
    }
  ) });
}

function StandardSiteRenderer({
  content,
  uri,
  did,
  basePath
}) {
  if (content?.$type === "pub.leaflet.content" && content.pages) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      LeafletRenderer,
      {
        document: { pages: content.pages },
        did,
        uri,
        basePath
      }
    );
  }
  if (content?.$type === "site.standard.content.markdown" && content.text) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(WhiteWindRenderer, { content: content.text });
  }
  return null;
}

const { format: date } = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium"
});

const $$Astro = createAstro("https://mmatt.net");
const $$rkey = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$rkey;
  const { rkey } = Astro2.params;
  const post = await getPost(rkey ?? "");
  const title = getPostTitle(post);
  const description = getPostDescription(post);
  const content = getPostContent(post);
  const createdAt = getPostCreatedAt(post);
  const reading = readingTime(content).text;
  Object.entries(getCacheHeaders()).forEach(
    ([name, value]) => Astro2.response.headers.set(name, value)
  );
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${title} \u2014 mmatt.net`, "description": `by Matt \xB7 ${reading}`, "canonical": `/post/${post.rkey}`, "image": `/post/${post.rkey}/opengraph-image` }, { "default": async ($$result2) => renderTemplate`  ${maybeRenderHead()}<div class="grid grid-rows-[20px_1fr_20px] justify-items-center min-h-dvh py-8 px-4 xs:px-8 pb-20 gap-16 sm:p-20"> <main class="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-6xl overflow-hidden"> <article class="w-full space-y-8"> <div class="space-y-4 w-full"> <a href="/" class="hover:underline hover:underline-offset-4 font-medium"> ${renderComponent($$result2, "ArrowLeftIcon", ArrowLeft, { "className": "inline size-4 align-middle mb-px mr-1" })}
Back
</a> ${renderComponent($$result2, "Title", Title, { "className": "text-center" }, { "default": async ($$result3) => renderTemplate`${title}` })} ${description && renderTemplate`<p class="font-sans text-pretty text-sm"> ${renderComponent($$result2, "NotepadTextIcon", NotepadText, { "className": "text-inherit inline size-3.5 mb-0.5" })}${" "} ${description} </p>`} <p class="font-sans text-pretty text-sm"> <img width="14" height="14"${addAttribute(me.src, "src")} alt="Matt's profile picture" class="inline rounded-full mr-1.5 mb-0.5"> <a href="https://bsky.app/profile/did:plc:tas6hj2xjrqben5653v5kohk" class="hover:underline hover:underline-offset-4">
Matt
</a>${" "}
&middot;${" "} ${createdAt && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <time${addAttribute(createdAt, "datetime")}>${date(new Date(createdAt))}</time> &middot;${" "}` })}`} ${renderComponent($$result2, "ClockIcon", Clock, { "className": "text-inherit inline size-3.5 mb-0.5" })} ${reading} ${renderComponent($$result2, "ViewCount", $$ViewCount, { "path": `/post/${post.rkey}` })} </p> <hr> </div> ${post.type === "whitewind" ? renderTemplate`${renderComponent($$result2, "WhiteWindRenderer", WhiteWindRenderer, { "content": post.value.content })}` : post.type === "leaflet" ? renderTemplate`${renderComponent($$result2, "LeafletRenderer", LeafletRenderer, { "document": post.value, "did": post.uri.split("/")[2], "uri": post.uri, "basePath": post.basePath, "isExternal": post.isExternal })}` : renderTemplate`${renderComponent($$result2, "StandardSiteRenderer", StandardSiteRenderer, { "content": post.value.content, "uri": post.uri, "did": post.uri.split("/")[2], "basePath": post.basePath })}`} </article> </main> </div> `, "head": async ($$result2) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "slot": "head" }, { "default": async ($$result3) => renderTemplate` <link rel="alternate"${addAttribute(post.uri, "href")}> ` })}` })}`;
}, "/Users/matt/dev/mmattbtw/website/src/pages/post/[rkey].astro", void 0);

const $$file = "/Users/matt/dev/mmattbtw/website/src/pages/post/[rkey].astro";
const $$url = "/post/[rkey]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$rkey,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
