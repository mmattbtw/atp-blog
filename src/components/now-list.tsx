import { getStatuses } from "#/lib/api";

export async function NowList() {
  const posts = await getStatuses();

  const sortedPosts = posts.sort(
    (a, b) =>
      new Date(b.value.createdAt ?? 0).getTime() -
      new Date(a.value.createdAt ?? 0).getTime(),
  );

  return sortedPosts.map((record) => {
    const post = record.value;
    return (
      <div
        className="flex flex-row justify-between items-center"
        key={record.cid}
      >
        <div>
          <p className="text-pretty">{post.text}</p>
          <p className="text-xs text-gray-500">
            {new Date(post.createdAt).toLocaleString()}
          </p>
        </div>
        {post.emoji && <p className="text-5xl">{post.emoji}</p>}
      </div>
    );
  });
}
