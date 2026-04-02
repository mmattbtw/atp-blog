import type { APIRoute } from "astro";

import { clearBlogCache } from "#/lib/blog";
import { readEnvFromLocals } from "#/lib/env";
import { purgeEdgeCache } from "#/lib/http-cache";

function getRedirectTarget(rkey?: string, suffix = "") {
  if (!rkey) {
    return `/purge${suffix}`;
  }

  return `/post/${encodeURIComponent(rkey)}/purge${suffix}`;
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const password = formData.get("password");
  const rkeyValue = formData.get("rkey");
  const rkey =
    typeof rkeyValue === "string" && rkeyValue.length > 0 && rkeyValue.length <= 128
      ? rkeyValue
      : undefined;
  const env = readEnvFromLocals(locals);

  if (!env.PURGE_PASSWORD) {
    return new Response("Purge password is not configured", { status: 503 });
  }

  if (typeof password !== "string" || password !== env.PURGE_PASSWORD) {
    return redirect(getRedirectTarget(rkey, "?error=yeah"));
  }

  const keys = ["rss", "letterboxd-rss"];
  if (rkey) {
    keys.push(`post-${rkey}`);
  } else {
    keys.push("home", "writing");
  }

  clearBlogCache();
  await purgeEdgeCache(request, keys);

  return redirect(rkey ? `/post/${encodeURIComponent(rkey)}` : "/");
};
