import { ArrowLeftIcon } from "lucide-react";
import { Viewport, type Metadata } from "next";
import Link from "next/link";
import readingTime from "reading-time";

import { LeafletRenderer } from "#/components/leaflet-renderer";
import { PostInfo } from "#/components/post-info";
import { Title } from "#/components/typography";
import { ViewCount } from "#/components/view-count";
import { WhiteWindRenderer } from "#/components/whitewind-renderer";
import { getPost, getPosts } from "#/lib/api";
import { env } from "#/lib/env";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

// Helper to get title from either post type
function getPostTitle(post: Awaited<ReturnType<typeof getPost>>): string {
  if (post.type === "whitewind") {
    return post.value.title?.split(" || ")[0] ?? "Untitled";
  }
  return post.value.title;
}

// Helper to get description from either post type
function getPostDescription(post: Awaited<ReturnType<typeof getPost>>): string | undefined {
  if (post.type === "whitewind") {
    return post.value.title?.split(" || ")[1];
  }
  return post.value.description;
}

// Helper to get content for reading time calculation
function getPostContent(post: Awaited<ReturnType<typeof getPost>>): string {
  if (post.type === "whitewind") {
    return post.value.content;
  }
  // For Leaflet, extract plaintext from all blocks
  let content = "";
  for (const page of post.value.pages) {
    if (page.$type === "pub.leaflet.pages.linearDocument") {
      const linearPage = page as { blocks: Array<{ block: { plaintext?: string } }> };
      for (const blockWrapper of linearPage.blocks) {
        if (blockWrapper.block.plaintext) {
          content += blockWrapper.block.plaintext + " ";
        }
      }
    }
  }
  return content;
}

// Helper to get createdAt from either post type
function getPostCreatedAt(post: Awaited<ReturnType<typeof getPost>>): string | undefined {
  if (post.type === "whitewind") {
    return post.value.createdAt;
  }
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
  const title = getPostTitle(post);
  const description = getPostDescription(post);
  const content = getPostContent(post);
  const createdAt = getPostCreatedAt(post);

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
            >
              <ViewCount path={`/post/${rkey}`} />
            </PostInfo>
            <hr />
          </div>
          {post.type === "whitewind" ? (
            <WhiteWindRenderer content={post.value.content} />
          ) : (
            <LeafletRenderer
              document={post.value}
              did={env.NEXT_PUBLIC_BSKY_DID}
              uri={post.uri}
              basePath={post.basePath}
            />
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
