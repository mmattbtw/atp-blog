import type {} from "@atcute/bluesky";

import { Client, simpleFetchHandler } from "@atcute/client";

import { env } from "./env";

const client = new Client({
  handler: simpleFetchHandler({ service: env.NEXT_PUBLIC_BSKY_PDS }),
});

export const bsky = client;
