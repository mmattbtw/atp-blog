import { getPosts } from "#/lib/api";

import { PostListItem } from "./post-list-item";
import { ViewCount } from "./view-count";

export async function PostList() {
  const posts = await getPosts();

  const sortedPosts = posts.sort(
    (a, b) =>
      new Date(b.value.createdAt ?? 0).getTime() -
      new Date(a.value.createdAt ?? 0).getTime(),
  );

  return (
    <div className="flex flex-col">
      {sortedPosts.map((record) => {
        const post = record.value;
        const rkey = record.uri.split("/").pop() || "";
        return (
          <PostListItem
            key={record.uri}
            post={post}
            rkey={rkey}
            viewCount={<ViewCount path={`/post/${rkey}`} />}
          />
        );
      })}
    </div>
  );
}
