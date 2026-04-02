import type { APIRoute } from "astro";

import { withEdgeCache } from "#/lib/http-cache";
import { fetchLetterboxdEntries } from "#/lib/letterboxd";

export const GET: APIRoute = async ({ request }) =>
  withEdgeCache(request, "letterboxd-rss", 3600, async () => {
    try {
      return Response.json({
        entries: await fetchLetterboxdEntries(),
      });
    } catch (error) {
      console.error("Error fetching Letterboxd RSS:", error);
      return Response.json(
        { error: "Failed to fetch Letterboxd RSS" },
        { status: 500 },
      );
    }
  });
