import type {} from "@atcute/bluesky";

import { Client, simpleFetchHandler } from "@atcute/client";

import { env } from "./env";

const client = new Client({
  handler: simpleFetchHandler({ service: env.NEXT_PUBLIC_BSKY_PDS }),
});

export const bsky = client;

async function resolvePdsFromPlc(did: string): Promise<string> {
  const response = await fetch(
    `https://plc.directory/${encodeURIComponent(did)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to resolve DID ${did} via plc.directory: ${response.statusText}`);
  }

  const didDocument = (await response.json()) as {
    service?: Array<{
      id?: string;
      type?: string;
      serviceEndpoint?: string;
    }>;
  };

  const pdsService = didDocument.service?.find(
    (service) =>
      service.id === "#atproto_pds" || service.type === "AtprotoPersonalDataServer",
  );

  if (!pdsService?.serviceEndpoint) {
    throw new Error(`No PDS found for DID ${did}`);
  }

  return pdsService.serviceEndpoint;
}

export async function resolvePds(did: string): Promise<string> {
  try {
    const response = await fetch(
      `https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(did)}`,
    );
    if (response.ok) {
      const miniDoc = (await response.json()) as { pds?: string };
      if (miniDoc.pds) {
        return miniDoc.pds;
      }
    }
  } catch {
    // Fall back to resolving through the PLC directory below.
  }

  return resolvePdsFromPlc(did);
}

// Create a client for a specific PDS
export function createPdsClient(pdsUrl: string): Client {
  return new Client({
    handler: simpleFetchHandler({ service: pdsUrl }),
  });
}
