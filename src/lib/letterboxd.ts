export interface LetterboxdEntry {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

export async function fetchLetterboxdEntries() {
  const response = await fetch("https://letterboxd.com/air2earth/rss/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LetterboxdRSSBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Letterboxd RSS: ${response.status}`);
  }

  const xmlText = await response.text();
  const entries: LetterboxdEntry[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null = null;

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
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/,
    );

    if (title && !title.includes("list") && !title.includes("watchlist")) {
      entries.push({
        title,
        link: linkMatch ? linkMatch[1] : "",
        pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
        description: descriptionMatch ? descriptionMatch[1] : undefined,
      });
    }
  }

  return entries.slice(0, 5);
}
