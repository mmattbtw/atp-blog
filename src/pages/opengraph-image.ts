import type { APIRoute } from "astro";

import { renderOgImage } from "#/lib/og";

export const GET: APIRoute = async ({ request }) =>
  renderOgImage({
    requestUrl: request.url,
    title: "mmatt.net",
    subtitle: "",
    backgroundPath: "/indexbg.png",
    textSize: 96,
  });
