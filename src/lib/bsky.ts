import type {} from "@atcute/bluesky";

import { Client, simpleFetchHandler } from "@atcute/client";

import { env } from "./env";

const client = new Client({
  handler: simpleFetchHandler({ service: env.NEXT_PUBLIC_BSKY_PDS }),
});

export const bsky = client;

// Resolve a DID to its PDS URL using slingshot's resolveMiniDoc endpoint
export async function resolvePds(did: string): Promise<string> {
  const response = await fetch(
    `https://slingshot.mmatt.net/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(did)}`
  );
  if (!response.ok) {
    throw new Error(`Failed to resolve DID ${did}: ${response.statusText}`);
  }
  const miniDoc = await response.json();
  // Extract the PDS endpoint from the mini doc
  if (!miniDoc.pds) {
    throw new Error(`No PDS found for DID ${did}`);
  }
  return miniDoc.pds;
}

// Create a client for a specific PDS
export function createPdsClient(pdsUrl: string): Client {
  return new Client({
    handler: simpleFetchHandler({ service: pdsUrl }),
  });
}
