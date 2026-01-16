"use client";

import type { BlogPost } from "#/lib/api";

import Link from "./ui/link";

// Helper to get title from either post type
function getPostTitle(post: BlogPost): string {
  if (post.type === "whitewind") {
    return post.value.title?.split(" || ")[0] ?? "Untitled";
  }
  return post.value.title;
}

// Helper to get createdAt from either post type
function getPostCreatedAt(post: BlogPost): string | undefined {
  if (post.type === "whitewind") {
    return post.value.createdAt;
  }
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
