import type { APIRoute } from "astro";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { getPosts } from "#/lib/blog";
import { getCacheHeaders, withEdgeCache } from "#/lib/http-cache";
import { getPostContent, getPostCreatedAt, getPostDescription, getPostTitle } from "#/lib/posts";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapCdata(value: string) {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

async function renderMarkdownToHtml(markdown: string) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return result.toString();
}

export const GET: APIRoute = async ({ request }) => {
  return withEdgeCache(request, "rss", 3600, async () => {
    const posts = await getPosts();
    const siteUrl = new URL("/", request.url).toString().replace(/\/$/, "");
    const rssUrl = `${siteUrl}/rss`;

    const items = await Promise.all(
      posts.map(async (post) => {
        const title = getPostTitle(post);
        const extractedDescription = getPostDescription(post);
        const contentDescription = await renderMarkdownToHtml(getPostContent(post));
        const fullDescription = extractedDescription
          ? `<p>Description: ${escapeHtml(extractedDescription)}</p><br><br>${contentDescription}`
          : contentDescription;
        const postUrl = `${siteUrl}/post/${encodeURIComponent(post.rkey)}`;

        return [
          "<item>",
          `<title>${wrapCdata(title)}</title>`,
          `<description>${wrapCdata(fullDescription)}</description>`,
          `<link>${postUrl}</link>`,
          `<guid>${postUrl}</guid>`,
          `<pubDate>${new Date(getPostCreatedAt(post) ?? Date.now()).toUTCString()}</pubDate>`,
          "</item>",
        ].join("\n");
      }),
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>${wrapCdata("mmatt.net")}</title>
          <link>${siteUrl}</link>
          <description>${wrapCdata("<_< ^_^ >_>")}</description>
          <atom:link href="${rssUrl}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom" />
          ${items.join("\n")}
        </channel>
      </rss>`;

    return new Response(xml, {
      headers: {
        "content-type": "application/rss+xml",
        ...getCacheHeaders(),
      },
    });
  });
};
