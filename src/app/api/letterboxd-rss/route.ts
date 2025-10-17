import { NextResponse } from "next/server";

interface LetterboxdEntry {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

export async function GET() {
  try {
    const response = await fetch("https://letterboxd.com/air2earth/rss/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LetterboxdRSSBot/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();

    // Parse XML to extract entries
    const entries: LetterboxdEntry[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];

      // Extract title - handle both CDATA and regular XML
      let titleMatch = itemContent.match(
        /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/,
      );
      if (!titleMatch) {
        titleMatch = itemContent.match(/<title>([^<]*)<\/title>/);
      }
      const title = titleMatch ? titleMatch[1] : "Unknown Title";

      // Extract link
      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
      const link = linkMatch ? linkMatch[1] : "";

      // Extract pubDate
      const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
      const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();

      // Extract description (optional) - handle multiline CDATA
      const descriptionMatch = itemContent.match(
        /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/,
      );
      const description = descriptionMatch ? descriptionMatch[1] : undefined;

      // Only include actual film entries (not lists or other content)
      if (title && !title.includes("list") && !title.includes("watchlist")) {
        entries.push({
          title,
          link,
          pubDate,
          description,
        });
      }
    }

    // Return the first few entries (most recent)
    return NextResponse.json({
      entries: entries.slice(0, 5),
    });
  } catch (error) {
    console.error("Error fetching Letterboxd RSS:", error);
    return NextResponse.json(
      { error: "Failed to fetch Letterboxd RSS" },
      { status: 500 },
    );
  }
}
