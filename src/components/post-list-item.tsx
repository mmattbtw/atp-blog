"use client";

import Link from "next/link";
import { ComWhtwndBlogEntry } from "@atcute/client/lexicons";

import { PostInfo } from "./post-info";
import { Title } from "./typography";

export function PostListItem({
  post,
  rkey,
  viewCount,
}: {
  post: ComWhtwndBlogEntry.Record;
  rkey: string;
  viewCount?: React.ReactNode;
}) {
  return (
    <>
      <Link href={`/post/${rkey}`} className="w-full group">
        <article className="w-full flex flex-row border-b items-stretch relative transition-color backdrop-blur-sm hover:bg-slate-700/5 dark:hover:bg-slate-200/10">
          <div className="flex-1 py-2 px-4 z-10 relative">
            <Title className="text-lg" level="h3">
              {post.title?.split(" || ")[0]}
            </Title>
            <PostInfo
              content={post.content}
              createdAt={post.createdAt}
              className="text-xs mt-1"
              desc={post.title?.split(" || ")[1]}
            >
              {viewCount}
            </PostInfo>
          </div>
        </article>
      </Link>
    </>
  );
}
