globalThis.process ??= {}; globalThis.process.env ??= {};
import { j as jsxRuntimeExports } from './jsx-runtime_DoH26EBh.mjs';
import { t as twMerge } from './bundle-mjs_yZvECcnH.mjs';

function Title({
  level = "h1",
  className,
  ...props
}) {
  const Tag = level;
  let style;
  switch (level) {
    case "h1":
      style = "text-4xl lg:text-5xl";
      break;
    case "h2":
      style = "border-b pb-2 text-3xl";
      break;
    case "h3":
      style = "text-2xl";
      break;
    case "h4":
      style = "text-xl";
      break;
    case "h5":
      style = "text-lg";
      break;
    case "h6":
      style = "text-base";
      break;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Tag,
    {
      className: twMerge(
        "font-serif font-bold  text-balance tracking-tight scroll-m-20 mt-8 [&>code]:text-[length:inherit] first:mt-0",
        style,
        className
      ),
      ...props
    }
  );
}
function Paragraph({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: twMerge("font-sans text-pretty", className), ...props });
}
function Code({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "code",
    {
      className: twMerge(
        "font-mono normal-case relative rounded-sm px-[0.3rem] py-[0.2rem] bg-slate-100 text-sm dark:bg-slate-800 dark:text-slate-100",
        className
      ),
      ...props
    }
  );
}

export { Code as C, Paragraph as P, Title as T };
