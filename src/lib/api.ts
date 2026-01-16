import { type ComAtprotoRepoListRecords } from "@atcute/atproto";
import { ok } from "@atcute/client";
import type { PubLeafletDocument, PubLeafletPublication } from "@atcute/leaflet";
import { ComWhtwndBlogEntry } from "@atcute/whitewind";

import { Record } from "../../lexiconTypes/types/net/mmatt/right/now";
import { Record as CarRecord } from "../../lexiconTypes/types/net/mmatt/vitals/car";
import { bsky, resolvePds, createPdsClient } from "./bsky";
import { env } from "./env";

// Manual list of external AT URIs to include in the post list
// These are posts written for other publications that should appear on this site
export const EXTERNAL_POSTS: string[] = [
  "at://did:plc:iwhuynr6mm6xxuh25o4do2tx/pub.leaflet.document/3lzlwe6puis2l",
];

export type BlogPost =
  | { type: "whitewind"; value: ComWhtwndBlogEntry.Main; uri: string; cid: string; isExternal?: false }
  | { type: "leaflet"; value: PubLeafletDocument.Main; uri: string; cid: string; basePath?: string; isExternal?: boolean };

export async function getPosts(): Promise<BlogPost[]> {
  // Fetch WhiteWind posts
  const whitewindPosts = await ok(
    bsky.get("com.atproto.repo.listRecords", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
        collection: "com.whtwnd.blog.entry",
        // todo: pagination
        // hi this is matt from the forking realm i'm never going to implement pagination
      },
    }),
  );

  // Fetch Leaflet documents
  const leafletPosts = await ok(
    bsky.get("com.atproto.repo.listRecords", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
        collection: "pub.leaflet.document",
      },
    }),
  );

  const whitewindFiltered = (whitewindPosts.records?.filter(drafts) ?? []) as (ComAtprotoRepoListRecords.Record & {
    value: ComWhtwndBlogEntry.Main;
  })[];

  const leafletFiltered = (leafletPosts.records?.filter(draftsLeaflet) ?? []) as (ComAtprotoRepoListRecords.Record & {
    value: PubLeafletDocument.Main;
  })[];

  // Fetch external posts
  const externalPosts = await Promise.all(
    EXTERNAL_POSTS.map(async (atUri) => {
      try {
        return await fetchExternalPost(atUri);
      } catch (error) {
        console.error(`Failed to fetch external post ${atUri}:`, error);
        return null;
      }
    }),
  );

  const posts: BlogPost[] = [
    ...whitewindFiltered.map((r) => ({
      type: "whitewind" as const,
      value: r.value,
      uri: r.uri,
      cid: r.cid,
      isExternal: false as const,
    })),
    ...leafletFiltered.map((r) => ({
      type: "leaflet" as const,
      value: r.value,
      uri: r.uri,
      cid: r.cid,
      isExternal: false as const,
    })),
    ...externalPosts.filter((p): p is BlogPost => p !== null),
  ];

  return posts;
}

// Helper to parse AT URI components
function parseAtUri(atUri: string): { did: string; collection: string; rkey: string } {
  // at://did:plc:xxx/collection/rkey
  const match = atUri.match(/^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) throw new Error(`Invalid AT URI: ${atUri}`);
  return { did: match[1], collection: match[2], rkey: match[3] };
}


// Fetch an external post by AT URI
async function fetchExternalPost(atUri: string): Promise<BlogPost | null> {
  const { did, collection, rkey } = parseAtUri(atUri);

  // Resolve the DID to get its PDS URL
  const pdsUrl = await resolvePds(did);
  const pdsClient = createPdsClient(pdsUrl);

  if (collection === "pub.leaflet.document") {
    const post = await ok(
      pdsClient.get("com.atproto.repo.getRecord", {
        params: {
          repo: did as `did:plc:${string}`,
          rkey,
          collection: "pub.leaflet.document",
        },
      }),
    );

    const leafletDoc = post.value as PubLeafletDocument.Main;

    // Fetch publication to get base_path
    let basePath: string | undefined;
    if (leafletDoc.publication) {
      try {
        const pubParsed = parseAtUri(leafletDoc.publication);
        // Publication might be on a different PDS
        const pubPdsUrl = await resolvePds(pubParsed.did);
        const pubPdsClient = createPdsClient(pubPdsUrl);
        const publication = await ok(
          pubPdsClient.get("com.atproto.repo.getRecord", {
            params: {
              repo: pubParsed.did as `did:plc:${string}`,
              rkey: pubParsed.rkey,
              collection: "pub.leaflet.publication",
            },
          }),
        );
        basePath = (publication.value as PubLeafletPublication.Main).base_path;
      } catch {
        // If we can't fetch the publication, continue without basePath
      }
    }

    return {
      type: "leaflet",
      value: leafletDoc,
      uri: post.uri,
      cid: post.cid!,
      basePath,
      isExternal: true,
    };
  }

  if (collection === "com.whtwnd.blog.entry") {
    const post = await ok(
      pdsClient.get("com.atproto.repo.getRecord", {
        params: {
          repo: did as `did:plc:${string}`,
          rkey,
          collection: "com.whtwnd.blog.entry",
        },
      }),
    );

    return {
      type: "whitewind",
      value: post.value as ComWhtwndBlogEntry.Main,
      uri: post.uri,
      cid: post.cid!,
      isExternal: false, // WhiteWind doesn't support isExternal yet
    };
  }

  return null;
}

export async function getLastestStatus() {
  const posts = await ok(
    bsky.get("com.atproto.repo.listRecords", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
        collection: "net.mmatt.right.now",
        limit: 1,
      },
    }),
  );
  return posts.records[0] as ComAtprotoRepoListRecords.Record & {
    value: Record;
  };
}

export async function getStatuses() {
  const posts = await ok(
    bsky.get("com.atproto.repo.listRecords", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
        collection: "net.mmatt.right.now",
        // todo: pagination
        // hi this is matt from the forking realm i'm never going to implement pagination
      },
    }),
  );
  return posts.records as (ComAtprotoRepoListRecords.Record & {
    value: Record;
  })[];
}

function drafts(record: ComAtprotoRepoListRecords.Record) {
  if (process.env.NODE_ENV === "development") return true;
  const post = record.value as ComWhtwndBlogEntry.Main;
  return post.visibility === "public";
}

function draftsLeaflet(record: ComAtprotoRepoListRecords.Record) {
  if (process.env.NODE_ENV === "development") return true;
  const post = record.value as PubLeafletDocument.Main;
  // Leaflet documents are public if they have a publishedAt date
  return !!post.publishedAt;
}

export async function getPost(rkey: string): Promise<BlogPost> {
  // Check if this rkey matches an external post
  const externalAtUri = EXTERNAL_POSTS.find((uri) => uri.endsWith(`/${rkey}`));
  if (externalAtUri) {
    const externalPost = await fetchExternalPost(externalAtUri);
    if (externalPost) return externalPost;
  }

  // Try WhiteWind first
  try {
    const post = await ok(
      bsky.get("com.atproto.repo.getRecord", {
        params: {
          repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
          rkey: rkey,
          collection: "com.whtwnd.blog.entry",
        },
      }),
    );

    return {
      type: "whitewind",
      value: post.value as ComWhtwndBlogEntry.Main,
      uri: post.uri,
      cid: post.cid!,
    };
  } catch {
    // Try Leaflet if WhiteWind fails
    const post = await ok(
      bsky.get("com.atproto.repo.getRecord", {
        params: {
          repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
          rkey: rkey,
          collection: "pub.leaflet.document",
        },
      }),
    );

    const leafletDoc = post.value as PubLeafletDocument.Main;

    // Fetch publication to get base_path if document has a publication reference
    let basePath: string | undefined;
    if (leafletDoc.publication) {
      try {
        // publication is an at-uri like at://did:plc:xxx/pub.leaflet.publication/rkey
        const pubParsed = parseAtUri(leafletDoc.publication);
        const publication = await ok(
          bsky.get("com.atproto.repo.getRecord", {
            params: {
              repo: pubParsed.did as `did:plc:${string}`,
              rkey: pubParsed.rkey,
              collection: "pub.leaflet.publication",
            },
          }),
        );
        basePath = (publication.value as PubLeafletPublication.Main).base_path;
      } catch {
        // If we can't fetch the publication, just use the DID
      }
    }

    return {
      type: "leaflet",
      value: leafletDoc,
      uri: post.uri,
      cid: post.cid!,
      basePath,
    };
  }
}

export async function getCarRecords(cursor?: string) {
  const cars = await ok(
    bsky.get("com.atproto.repo.listRecords", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
        collection: "net.mmatt.vitals.car",
        limit: 100,
        cursor,
      },
    }),
  );
  return {
    records: cars.records as (ComAtprotoRepoListRecords.Record & {
      value: CarRecord;
    })[],
    cursor: cars.cursor,
  };
}
