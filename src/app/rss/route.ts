import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import RSS from "rss";
import { unified } from "unified";

import { getPosts, type BlogPost } from "#/lib/api";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

// Helper to get title from either post type
function getPostTitle(post: BlogPost): string {
  if (post.type === "whitewind") {
    return post.value.title?.split(" || ")[0] ?? "Untitled";
  }
  return post.value.title;
}

// Helper to get description from either post type
function getPostDescription(post: BlogPost): string {
  if (post.type === "whitewind") {
    return post.value.title?.split(" || ").slice(1).join(" || ") ?? "";
  }
  return post.value.description ?? "";
}

// Helper to get content from either post type
function getPostContent(post: BlogPost): string {
  if (post.type === "whitewind") {
    return post.value.content;
  }
  // For Leaflet, extract plaintext from all blocks
  let content = "";
  for (const page of post.value.pages) {
    if (page.$type === "pub.leaflet.pages.linearDocument") {
      const linearPage = page as { blocks: Array<{ block: { plaintext?: string } }> };
      for (const blockWrapper of linearPage.blocks) {
        if (blockWrapper.block.plaintext) {
          content += blockWrapper.block.plaintext + "\n\n";
        }
      }
    }
  }
  return content;
}

// Helper to get createdAt from either post type
function getPostCreatedAt(post: BlogPost): string | undefined {
  if (post.type === "whitewind") {
    return post.value.createdAt;
  }
  return post.value.publishedAt;
}

export async function GET() {
  const posts = await getPosts();

  const rss = new RSS({
    title: "mmatt.net",
    feed_url: "https://mmatt.net/rss",
    site_url: "https://mmatt.net",
    description: "<_< ^_^ >_>",
  });

  for (const post of posts) {
    const title = getPostTitle(post);
    const extractedDescription = getPostDescription(post);
    const content = getPostContent(post);

    const contentDescription = await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeFormat)
      .use(rehypeStringify)
      .process(content)
      .then((v) => v.toString());

    const fullDescription = extractedDescription
      ? `<p>Description: ${extractedDescription}</p><br><br>${contentDescription}`
      : contentDescription;

    rss.item({
      title: title,
      description: fullDescription,
      url: `https://mmatt.net/post/${post.uri.split("/").pop()}`,
      date: new Date(getPostCreatedAt(post) ?? Date.now()),
    });
  }

  return new Response(rss.xml(), {
    headers: {
      "content-type": "application/rss+xml",
    },
  });
}
