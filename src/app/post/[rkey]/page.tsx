import { ArrowLeftIcon } from "lucide-react";
import Markdown from "react-markdown";
import { Viewport, type Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Code as SyntaxHighlighter } from "bright";
import readingTime from "reading-time";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { BlueskyPostEmbed } from "#/components/bluesky-embed";
import { PostInfo } from "#/components/post-info";
import { Code, Paragraph, Title } from "#/components/typography";
import { ViewCount } from "#/components/view-count";
import { getPost, getPosts } from "#/lib/api";
import { env } from "#/lib/env";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rkey: string }>;
}): Promise<Metadata> {
  const { rkey } = await params;

  const post = await getPost(rkey);

  return {
    metadataBase: new URL("https://mmatt.net"),
    title: (post.value.title?.split(" || ")[0] ?? "Untitled") + " — mmatt.net",
    authors: [
      {
        name: "Matt",
        url: `https://bsky.app/profile/${env.NEXT_PUBLIC_BSKY_DID}`,
      },
    ],
    description: `by Matt · ${readingTime(post.value.content).text}`,
    other: {
      "fediverse:creator": "@matt@social.lol",
    },
  };
}

export const viewport: Viewport = {
  themeColor: {
    color: "#BEFCFF",
    media: "not screen",
  },
};

export default async function BlogPage({
  params,
}: {
  params: Promise<{ rkey: string }>;
}) {
  const { rkey } = await params;

  const post = await getPost(rkey);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] justify-items-center min-h-dvh py-8 px-4 xs:px-8 pb-20 gap-16 sm:p-20">
      <link rel="alternate" href={post.uri} />
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-6xl overflow-hidden">
        <article className="w-full space-y-8">
          <div className="space-y-4 w-full">
            <Link
              href="/"
              className="hover:underline hover:underline-offset-4 font-medium"
            >
              <ArrowLeftIcon className="inline size-4 align-middle mb-px mr-1" />
              Back
            </Link>
            <Title className="text-center">
              {post.value.title?.split(" || ")[0]}
            </Title>
            <PostInfo
              content={post.value.content}
              createdAt={post.value.createdAt}
              includeAuthor
              className="text-sm"
              desc={post.value.title?.split(" || ")[1]}
            >
              <ViewCount path={`/post/${rkey}`} />
            </PostInfo>
            <hr />
          </div>
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
                    <BlueskyPostEmbed
                      uri={props["data-bluesky-uri"] as string}
                    />
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
                      <SyntaxHighlighter
                        {...rest}
                        // eslint-disable-next-line react/no-children-prop
                        children={String(children).replace(/\n$/, "")}
                        lang={match[1]}
                        className="mt-8! text-sm rounded-sm max-w-full! overflow-hidden"
                      />
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
              {post.value.content}
            </Markdown>
          </div>
        </article>
      </main>
    </div>
  );
}

// prefetch at build time
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({
    rkey: post.uri.split("/").pop(),
  }));
}
