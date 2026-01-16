import { type ComAtprotoRepoListRecords } from "@atcute/atproto";
import { ok } from "@atcute/client";
import type { PubLeafletDocument, PubLeafletPublication } from "@atcute/leaflet";
import { ComWhtwndBlogEntry } from "@atcute/whitewind";

import { Record } from "../../lexiconTypes/types/net/mmatt/right/now";
import { Record as CarRecord } from "../../lexiconTypes/types/net/mmatt/vitals/car";
import { bsky } from "./bsky";
import { env } from "./env";

export type BlogPost =
  | { type: "whitewind"; value: ComWhtwndBlogEntry.Main; uri: string; cid: string }
  | { type: "leaflet"; value: PubLeafletDocument.Main; uri: string; cid: string; basePath?: string };

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

  const posts: BlogPost[] = [
    ...whitewindFiltered.map((r) => ({
      type: "whitewind" as const,
      value: r.value,
      uri: r.uri,
      cid: r.cid,
    })),
    ...leafletFiltered.map((r) => ({
      type: "leaflet" as const,
      value: r.value,
      uri: r.uri,
      cid: r.cid,
    })),
  ];

  return posts;
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
        const pubRkey = leafletDoc.publication.split("/").pop();
        const publication = await ok(
          bsky.get("com.atproto.repo.getRecord", {
            params: {
              repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
              rkey: pubRkey!,
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
