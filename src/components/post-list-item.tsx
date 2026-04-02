import type { BlogPost } from "#/lib/blog";
import { date } from "#/lib/date";

import Link from "./ui/link";

export default function PostListItem({ post }: { post: BlogPost }) {
  const publishedAt = post.createdAt ? date(new Date(post.createdAt)) : "Undated";

  return (
    <Link href={`/post/${post.rkey}`}>
      {publishedAt} - {post.title}
    </Link>
  );
}
