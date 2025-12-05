import Markdown from "react-markdown";
import { Viewport, type Metadata } from "next";
import Image from "next/image";
import { Code as SyntaxHighlighter } from "bright";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { Code, Paragraph, Title } from "#/components/typography";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "DeerDirect Privacy Policy — mmatt.net",
  description: "Privacy policy for the DeerDirect app and related services.",
  metadataBase: new URL("https://mmatt.net"),
};

export const viewport: Viewport = {
  themeColor: {
    color: "#BEFCFF",
    media: "not screen",
  },
};

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

export default function DeerDirectPrivacyPolicyPage() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] justify-items-center min-h-dvh py-8 px-4 xs:px-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-3xl overflow-hidden">
        <article className="w-full space-y-8">
          <div className="space-y-4 w-full">
            <Title className="text-center">DeerDirect Privacy Policy</Title>
            <hr />
          </div>
          <div>
            <Markdown
              remarkPlugins={[remarkGfm]}
              remarkRehypeOptions={{ allowDangerousHtml: true }}
              rehypePlugins={[
                rehypeRaw,
                [
                  rehypeSanitize,
                  {
                    ...defaultSchema,
                  } as typeof defaultSchema,
                ],
              ]}
              components={{
                h1: (props) => <Title level="h1" {...props} />,
                h2: (props) => <Title level="h2" {...props} />,
                h3: (props) => <Title level="h3" {...props} />,
                h4: (props) => <Title level="h4" {...props} />,
                h5: (props) => <Title level="h5" {...props} />,
                h6: (props) => <Title level="h6" {...props} />,
                p: (props) => (
                  <Paragraph className="leading-7 not-first:mt-6" {...props} />
                ),
                ul: (props) => (
                  <ul
                    className="my-6 ml-6 list-disc [&>ul]:my-2 [&>ol]:my-2 [&>li]:mt-2"
                    {...props}
                  />
                ),
                ol: (props) => (
                  <ol
                    className="my-6 ml-6 list-decimal [&>ul]:my-2 [&>ol]:my-2 [&>li]:mt-2"
                    {...props}
                  />
                ),
                li: (props) => <li className="leading-7" {...props} />,
                code: (props) => {
                  const { children, className, ...rest } = props as {
                    children: React.ReactNode;
                    className?: string;
                    [key: string]: unknown;
                  };
                  const match = /language-(\w+)/.exec(className || "");
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        {...rest}
                        lang={match[1]}
                        className="mt-8! text-sm rounded-sm max-w-full! overflow-hidden"
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    );
                  }
                  return (
                    <Code
                      {...(props as {
                        children: React.ReactNode;
                        className?: string;
                      })}
                    />
                  );
                },
                a: ({ href, ...props }) => (
                  <a
                    href={href}
                    className="font-medium underline underline-offset-4"
                    {...props}
                  />
                ),
                img: ({ src, alt }) => (
                  <span className="block mt-8 w-full aspect-video relative">
                    <Image
                      src={typeof src === "string" ? src : ""}
                      alt={alt!}
                      className="object-contain"
                      quality={90}
                      fill
                    />
                  </span>
                ),
              }}
            >
              {markdownContent}
            </Markdown>
          </div>
        </article>
      </main>
    </div>
  );
}
