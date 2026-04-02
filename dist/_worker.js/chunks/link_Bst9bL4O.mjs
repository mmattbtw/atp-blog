globalThis.process ??= {}; globalThis.process.env ??= {};
import { j as jsxRuntimeExports } from './jsx-runtime_DoH26EBh.mjs';

function Link({
  href,
  children,
  target,
  rel,
  className = ""
}) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const linkClassName = `underline bg-white dark:bg-black hover:text-white hover:bg-black dark:hover:text-black dark:hover:bg-white ${className}`;
  if (isExternal) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "a",
      {
        href,
        target: target || "_blank",
        rel: rel || "noopener noreferrer",
        className: linkClassName,
        children
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href, className: linkClassName, children });
}

export { Link as L };
