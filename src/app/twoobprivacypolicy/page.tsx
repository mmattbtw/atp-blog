import Markdown from "react-markdown";
import { Viewport, type Metadata } from "next";
import { Code as SyntaxHighlighter } from "bright";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { Code, Paragraph, Title } from "#/components/typography";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "Twoob Privacy Policy — mmatt.net",
  description: "Privacy policy for the Twoob app and related services.",
  metadataBase: new URL("https://mmatt.net"),
};

export const viewport: Viewport = {
  themeColor: {
    color: "#BEFCFF",
    media: "not screen",
  },
};

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
Twoob does not use remote code. All JavaScript and CSS are bundled within the extension package. No external scripts, modules, or eval’d code are used.

## Changes
If this policy changes, the updated version will be posted in this file.

## Contact
If you have questions about this policy, contact matt (@) mmatt.net 
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
                img: () => (
                  <span className="block mt-8 w-full aspect-video relative">
                    <p>image</p>
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
