import { ArrowLeftIcon } from "lucide-react";
import type { PubLeafletPagesLinearDocument } from "@atcute/leaflet";
import { Viewport, type Metadata } from "next";
import Link from "next/link";
import readingTime from "reading-time";

import { LeafletRenderer } from "#/components/leaflet-renderer";
import { PostInfo } from "#/components/post-info";
import { Title } from "#/components/typography";
import { ViewCount } from "#/components/view-count";
import { getPost, getPosts } from "#/lib/api";
import { env } from "#/lib/env";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

function getPostTitle(post: Awaited<ReturnType<typeof getPost>>): string {
  return post.value.title;
}

function getPostDescription(post: Awaited<ReturnType<typeof getPost>>): string | undefined {
  return post.value.description;
}

function getPostContent(post: Awaited<ReturnType<typeof getPost>>): string {
  if (post.value.textContent) return post.value.textContent;
  if (
    !post.value.content ||
    post.value.content.$type !== "pub.leaflet.content" ||
    !post.value.content.pages
  ) {
    return "";
  }

  let content = "";
  for (const page of post.value.content.pages) {
    if (page.$type === "pub.leaflet.pages.linearDocument") {
      const linearPage = page as PubLeafletPagesLinearDocument.Main;
      for (const blockWrapper of linearPage.blocks) {
        if ("plaintext" in blockWrapper.block && blockWrapper.block.plaintext) {
          content += blockWrapper.block.plaintext + " ";
        }
      }
    }
  }
  return content;
}

function getPostCreatedAt(post: Awaited<ReturnType<typeof getPost>>): string | undefined {
  return post.value.publishedAt;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rkey: string }>;
}): Promise<Metadata> {
  const { rkey } = await params;

  const post = await getPost(rkey);
  const title = getPostTitle(post);
  const content = getPostContent(post);

  return {
    metadataBase: new URL("https://mmatt.net"),
    title: title + " — mmatt.net",
    authors: [
      {
        name: "Matt",
        url: `https://bsky.app/profile/${env.NEXT_PUBLIC_BSKY_DID}`,
      },
    ],
    description: `by Matt · ${readingTime(content).text}`,
    other: {
      "fediverse:creator": "@matt@mmatt.net",
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
  const title = getPostTitle(post);
  const description = getPostDescription(post);
  const content = getPostContent(post);
  const createdAt = getPostCreatedAt(post);
  const originalUrl = new URL(post.value.path ?? `/post/${rkey}`, post.publication.url).toString();

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
            <Title className="text-center">{title}</Title>
            <PostInfo
              content={content}
              createdAt={createdAt}
              includeAuthor
              className="text-sm"
              desc={description}
              originalUrl={originalUrl}
            >
              <ViewCount path={`/post/${rkey}`} />
            </PostInfo>
            <hr />
          </div>
          {post.value.content &&
          post.value.content.$type === "pub.leaflet.content" &&
          post.value.content.pages ? (
            <LeafletRenderer
              content={post.value.content}
              did={post.uri.split("/")[2]}
              originalUrl={originalUrl}
              isExternal={post.isExternal}
            />
          ) : (
            <div className="space-y-6">
              {post.value.textContent?.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index} className="leading-7">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
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
