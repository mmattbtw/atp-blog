import type { AppEnv } from "./env";

export async function fetchPageViewCount(path: string, env: AppEnv) {
  if (!env.PLAUSIBLE_API_KEY) {
    return null;
  }

  const response = await fetch(`${env.PLAUSIBLE_DOMAIN}/api/v2/query`, {
    headers: {
      Authorization: `Bearer ${env.PLAUSIBLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      site_id: env.PLAUSIBLE_SITE_ID,
      metrics: ["pageviews"],
      date_range: "all",
      filters: [["is", "event:page", [path]]],
    }),
  });

  const data = (await response.json()) as
    | { results?: [{ metrics?: number[] }] }
    | { error: string };

  if ("error" in data) {
    console.error(data.error);
    return null;
  }

  const pageviews = data?.results?.[0]?.metrics?.[0];

  if (typeof pageviews !== "number") {
    return null;
  }

  return pageviews;
}

export function formatPageViewCount(pageviews: number) {
  const formatter = Intl.NumberFormat("en-GB", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });

  return `${formatter.format(pageviews).toLocaleLowerCase()} views`;
}
