import type { BlogPost } from "./blog";

function getLeafletContentText(
  pages: Array<{ $type: string; blocks?: Array<{ block: { plaintext?: string } }> }>,
): string {
  let content = "";

  for (const page of pages) {
    if (page.$type !== "pub.leaflet.pages.linearDocument") {
      continue;
    }

    for (const blockWrapper of page.blocks ?? []) {
      if (blockWrapper.block.plaintext) {
        content += `${blockWrapper.block.plaintext}\n\n`;
      }
    }
  }

  return content;
}

export function getPostTitle(post: BlogPost): string {
  return post.title;
}

export function getPostDescription(post: BlogPost): string | undefined {
  return post.description;
}

export function getPostCreatedAt(post: BlogPost): string | undefined {
  return post.createdAt;
}

export function getPostContent(post: BlogPost): string {
  if (post.type === "whitewind") {
    return post.value.content;
  }

  if (post.type === "standard-site") {
    const content = post.value.content as
      | { $type?: string; text?: string; pages?: Array<{ $type: string; blocks?: Array<{ block: { plaintext?: string } }> }> }
      | undefined;

    if (content?.$type === "pub.leaflet.content" && content.pages) {
      return getLeafletContentText(content.pages);
    }

    if (content?.$type === "site.standard.content.markdown" && content.text) {
      return content.text;
    }

    return post.value.textContent ?? "";
  }

  return getLeafletContentText(
    post.value.pages as Array<{
      $type: string;
      blocks?: Array<{ block: { plaintext?: string } }>;
    }>,
  );
}
