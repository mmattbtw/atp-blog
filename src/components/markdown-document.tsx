import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { Code, Paragraph, Title } from "./typography";

export function MarkdownDocument({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] justify-items-center min-h-dvh py-8 px-4 xs:px-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-3xl overflow-hidden">
        <article className="w-full space-y-8">
          <div className="space-y-4 w-full">
            <Title className="text-center">{title}</Title>
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
                      <pre className="mt-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-sm overflow-x-auto">
                        <code {...rest} className="text-sm">
                          {String(children).replace(/\n$/, "")}
                        </code>
                      </pre>
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
              {content}
            </Markdown>
          </div>
        </article>
      </main>
    </div>
  );
}
