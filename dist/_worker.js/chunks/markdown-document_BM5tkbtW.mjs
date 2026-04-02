globalThis.process ??= {}; globalThis.process.env ??= {};
import { j as jsxRuntimeExports } from './jsx-runtime_DoH26EBh.mjs';
import { T as Title, C as Code, P as Paragraph } from './typography_ByiWqmcU.mjs';
import { M as Markdown, r as rehypeRaw, a as rehypeSanitize, d as defaultSchema, b as remarkGfm } from './index_Co1PLFGp.mjs';

function MarkdownDocument({
  title,
  content
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-rows-[20px_1fr_20px] justify-items-center min-h-dvh py-8 px-4 xs:px-8 pb-20 gap-16 sm:p-20", children: /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-3xl overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "w-full space-y-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4 w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { className: "text-center", children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("hr", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Markdown,
      {
        remarkPlugins: [remarkGfm],
        remarkRehypeOptions: { allowDangerousHtml: true },
        rehypePlugins: [
          rehypeRaw,
          [
            rehypeSanitize,
            {
              ...defaultSchema
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
            }
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              Code,
              {
                ...props
              }
            );
          },
          a: ({ href, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "a",
            {
              href,
              className: "font-medium underline underline-offset-4",
              ...props
            }
          ),
          img: () => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block mt-8 w-full aspect-video relative", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "image" }) })
        },
        children: content
      }
    ) })
  ] }) }) });
}

export { MarkdownDocument as M };
