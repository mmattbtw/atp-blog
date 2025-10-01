"use client";

import Link from "next/link";
import { ComWhtwndBlogEntry } from "@atcute/client/lexicons";

export function PostListItem({
  post,
  rkey,
}: {
  post: ComWhtwndBlogEntry.Record;
  rkey: string;
  viewCount?: React.ReactNode;
}) {
  return (
    <Link
      href={`/post/${rkey}`}
      className="underline bg-white dark:bg-black hover:text-white hover:bg-black dark:hover:text-black dark:hover:bg-white "
    >
      {post.title?.split(" || ")[0]}
    </Link>
  );
}
