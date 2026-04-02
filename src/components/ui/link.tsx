import type { ReactNode } from "react";

interface LinkProps {
  href: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  className?: string;
}

export default function Link({
  href,
  children,
  target,
  rel,
  className = "",
}: LinkProps) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const linkClassName = `underline bg-white dark:bg-black hover:text-white hover:bg-black dark:hover:text-black dark:hover:bg-white ${className}`;

  if (isExternal) {
    return (
      <a
        href={href}
        target={target || "_blank"}
        rel={rel || "noopener noreferrer"}
        className={linkClassName}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={href} className={linkClassName}>
      {children}
    </a>
  );
}
