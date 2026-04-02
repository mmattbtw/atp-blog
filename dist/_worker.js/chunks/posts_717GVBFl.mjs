globalThis.process ??= {}; globalThis.process.env ??= {};
function getLeafletContentText(pages) {
  let content = "";
  for (const page of pages) {
    if (page.$type !== "pub.leaflet.pages.linearDocument") {
      continue;
    }
    for (const blockWrapper of page.blocks ?? []) {
      if (blockWrapper.block.plaintext) {
        content += `${blockWrapper.block.plaintext}

`;
      }
    }
  }
  return content;
}
function getPostTitle(post) {
  return post.title;
}
function getPostDescription(post) {
  return post.description;
}
function getPostCreatedAt(post) {
  return post.createdAt;
}
function getPostContent(post) {
  if (post.type === "whitewind") {
    return post.value.content;
  }
  if (post.type === "standard-site") {
    const content = post.value.content;
    if (content?.$type === "pub.leaflet.content" && content.pages) {
      return getLeafletContentText(content.pages);
    }
    if (content?.$type === "site.standard.content.markdown" && content.text) {
      return content.text;
    }
    return post.value.textContent ?? "";
  }
  return getLeafletContentText(
    post.value.pages
  );
}

export { getPostDescription as a, getPostContent as b, getPostCreatedAt as c, getPostTitle as g };
