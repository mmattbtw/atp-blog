import type { APIRoute } from "astro";

import { getPost } from "#/lib/blog";
import { renderOgImage } from "#/lib/og";
import { getPostTitle } from "#/lib/posts";

export const GET: APIRoute = async ({ params, request }) => {
  const post = await getPost(params.rkey ?? "");

  return renderOgImage({
    requestUrl: request.url,
    title: getPostTitle(post),
    subtitle: "mmatt.net",
    backgroundPath: "/blogbg.png",
    textSize: 80,
  });
};
