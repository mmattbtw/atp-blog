"use client";

import Link from "next/link";
import * as Whitewind from "@atcute/whitewind";

export function PostListItem({
  post,
  rkey,
}: {
  post: Whitewind.ComWhtwndBlogEntry.Main;
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
