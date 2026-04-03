import type { PubLeafletPagesLinearDocument } from "@atcute/leaflet";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import RSS from "rss";
import { unified } from "unified";

import { getPosts, type BlogPost } from "#/lib/api";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

function getPostTitle(post: BlogPost): string {
  return post.value.title;
}

function getPostDescription(post: BlogPost): string {
  return post.value.description ?? "";
}

function getPostContent(post: BlogPost): string {
  if (post.value.textContent) return post.value.textContent;
  if (
    !post.value.content ||
    post.value.content.$type !== "pub.leaflet.content" ||
    !post.value.content.pages
  ) {
    return "";
  }

  let content = "";
  for (const page of post.value.content.pages) {
    if (page.$type === "pub.leaflet.pages.linearDocument") {
      const linearPage = page as PubLeafletPagesLinearDocument.Main;
      for (const blockWrapper of linearPage.blocks) {
        if ("plaintext" in blockWrapper.block && blockWrapper.block.plaintext) {
          content += blockWrapper.block.plaintext + "\n\n";
        }
      }
    }
  }
  return content;
}

function getPostCreatedAt(post: BlogPost): string | undefined {
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
