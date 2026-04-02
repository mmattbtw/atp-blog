import type {} from "@atcute/bluesky";

import { Client, simpleFetchHandler } from "@atcute/client";

import { env } from "./env";

const client = new Client({
  handler: simpleFetchHandler({ service: env.BSKY_PDS_URL }),
});

export const bsky = client;
const pdsResolutionCache = new Map<string, Promise<string>>();

async function resolvePdsViaSlingshot(did: string): Promise<string> {
  const response = await fetch(
    `https://slingshot.mmatt.net/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(did)}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to resolve DID ${did}: ${response.statusText}`);
  }

  const miniDoc = await response.json();

  if (!miniDoc.pds) {
    throw new Error(`No PDS found for DID ${did}`);
  }

  return miniDoc.pds;
}

async function resolvePdsViaPlcDirectory(did: string): Promise<string> {
  const response = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);

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
      service.type === "AtprotoPersonalDataServer" &&
      typeof service.serviceEndpoint === "string",
  );

  if (!pdsService?.serviceEndpoint) {
    throw new Error(`No PDS found for DID ${did} via plc.directory`);
  }

  return pdsService.serviceEndpoint;
}

export async function resolvePds(did: string): Promise<string> {
  const cached = pdsResolutionCache.get(did);
  if (cached) {
    return cached;
  }

  const resolution = (async () => {
    try {
      return await resolvePdsViaSlingshot(did);
    } catch (error) {
      console.warn(`Falling back to plc.directory for DID ${did}:`, error);
      return resolvePdsViaPlcDirectory(did);
    }
  })();

  pdsResolutionCache.set(did, resolution);
  return resolution;
}

// Create a client for a specific PDS
export function createPdsClient(pdsUrl: string): Client {
  return new Client({
    handler: simpleFetchHandler({ service: pdsUrl }),
  });
}
