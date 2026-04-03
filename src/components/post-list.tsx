import { getPosts, type BlogPost } from "#/lib/api";

import { PostListItem } from "./post-list-item";
import { ViewCount } from "./view-count";

function getPostCreatedAt(post: BlogPost): string | undefined {
  return post.value.publishedAt;
}

export async function PostList() {
  const posts = await getPosts();

  const sortedPosts = posts.sort(
    (a, b) =>
      new Date(getPostCreatedAt(b) ?? 0).getTime() -
      new Date(getPostCreatedAt(a) ?? 0).getTime(),
  );

  return (
    <div className="flex flex-col">
      {sortedPosts.map((post) => {
        const rkey = post.uri.split("/").pop() || "";
        return (
          <PostListItem
            key={post.uri}
            post={post}
            rkey={rkey}
            viewCount={<ViewCount path={`/post/${rkey}`} />}
          />
        );
      })}
    </div>
  );
}
