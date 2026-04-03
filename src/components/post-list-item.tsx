"use client";

import type { BlogPost } from "#/lib/api";

import Link from "./ui/link";

function getPostTitle(post: BlogPost): string {
  return post.value.title;
}

function getPostCreatedAt(post: BlogPost): string | undefined {
  return post.value.publishedAt;
}

export function PostListItem({
  post,
  rkey,
}: {
  post: BlogPost;
  rkey: string;
  viewCount?: React.ReactNode;
}) {
  const title = getPostTitle(post);
  const createdAt = getPostCreatedAt(post);

  return (
    <Link href={`/post/${rkey}`}>
      {new Date(createdAt ?? "").toLocaleDateString()} - {title}
    </Link>
  );
}
