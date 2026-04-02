import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { BlueskyPostEmbed } from "./bluesky-embed";
import { Code, Paragraph, Title } from "./typography";

interface WhiteWindRendererProps {
  content: string;
}

export function WhiteWindRenderer({ content }: WhiteWindRendererProps) {
  return (
    <div className="[&>.bluesky-embed]:mt-8 [&>.bluesky-embed]:mb-0">
      <Markdown
        remarkPlugins={[remarkGfm]}
        remarkRehypeOptions={{ allowDangerousHtml: true }}
        rehypePlugins={[
          rehypeRaw,
          [
            rehypeSanitize,
            {
              ...defaultSchema,
              attributes: {
                ...defaultSchema.attributes,
                blockquote: [
                  ...(defaultSchema.attributes?.blockquote ?? []),
                  "dataBlueskyUri",
                  "dataBlueskyCid",
                ],
              },
            } satisfies typeof defaultSchema,
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
          blockquote: (props) =>
            "data-bluesky-uri" in props ? (
              <BlueskyPostEmbed uri={props["data-bluesky-uri"] as string} />
            ) : (
              <blockquote
                className="mt-6 border-l-2 pl-4 italic border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400"
                {...props}
              />
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
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            if (match) {
              return (
                <pre className="mt-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-sm overflow-x-auto">
                  <code {...rest} className="text-sm">
                    {String(children).replace(/\n$/, "")}
                  </code>
                </pre>
              );
            } else {
              return <Code {...props} />;
            }
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
              <img
                src={typeof src === "string" ? src : ""}
                alt={alt ?? ""}
                className="object-contain w-full h-full absolute inset-0"
                loading="lazy"
              />
            </span>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
