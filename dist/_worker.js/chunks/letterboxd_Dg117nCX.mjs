globalThis.process ??= {}; globalThis.process.env ??= {};
async function fetchLetterboxdEntries() {
  const response = await fetch("https://letterboxd.com/air2earth/rss/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LetterboxdRSSBot/1.0)"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Letterboxd RSS: ${response.status}`);
  }
  const xmlText = await response.text();
  const entries = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match = null;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    let titleMatch = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    if (!titleMatch) {
      titleMatch = itemContent.match(/<title>([^<]*)<\/title>/);
    }
    const title = titleMatch ? titleMatch[1] : "Unknown Title";
    const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
    const descriptionMatch = itemContent.match(
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/
    );
    if (title && !title.includes("list") && !title.includes("watchlist")) {
      entries.push({
        title,
        link: linkMatch ? linkMatch[1] : "",
        pubDate: pubDateMatch ? pubDateMatch[1] : (/* @__PURE__ */ new Date()).toISOString(),
        description: descriptionMatch ? descriptionMatch[1] : void 0
      });
    }
  }
  return entries.slice(0, 5);
}

export { fetchLetterboxdEntries as f };
