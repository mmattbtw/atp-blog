"use client";

import { ComWhtwndBlogEntry } from "@atcute/whitewind";

import Link from "./ui/link";

export function PostListItem({
  post,
  rkey,
}: {
  post: ComWhtwndBlogEntry.Main;
  rkey: string;
  viewCount?: React.ReactNode;
}) {
  return (
    <Link href={`/post/${rkey}`}>
      {new Date(post.createdAt ?? "").toLocaleDateString()} -{" "}
      {post.title?.split(" || ")[0]}
    </Link>
  );
}
