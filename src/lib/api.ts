import { type ComAtprotoRepoListRecords } from "@atcute/atproto";
import { ok } from "@atcute/client";
import type { PubLeafletPagesLinearDocument } from "@atcute/leaflet";
import {
  type SiteStandardDocument as SiteStandardDocumentLexicon,
  type SiteStandardPublication as SiteStandardPublicationLexicon,
} from "@atcute/standard-site";

import { Record } from "../../lexiconTypes/types/net/mmatt/right/now";
import { Record as CarRecord } from "../../lexiconTypes/types/net/mmatt/vitals/car";
import { bsky, createPdsClient, resolvePds } from "./bsky";
import { env } from "./env";

const STANDARD_SITE_PUBLICATION_URI =
  "at://did:plc:tas6hj2xjrqben5653v5kohk/site.standard.publication/3m2cfka6wcs2o";

export const EXTERNAL_POSTS: string[] = [
  "at://did:plc:iwhuynr6mm6xxuh25o4do2tx/site.standard.document/3lzlwe6puis2l",
];

type StandardSitePublication = SiteStandardPublicationLexicon.Main;
type StandardSiteDocument = Omit<SiteStandardDocumentLexicon.Main, "content"> & {
  content?: {
    $type: string;
    pages?: PubLeafletPagesLinearDocument.Main[];
  };
};

export type BlogPost = {
  type: "standard";
  value: StandardSiteDocument;
  publication: StandardSitePublication;
  uri: string;
  cid: string;
  isExternal?: boolean;
};

function parseAtUri(atUri: string): { did: string; collection: string; rkey: string } {
  const match = atUri.match(/^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) throw new Error(`Invalid AT URI: ${atUri}`);
  return { did: match[1], collection: match[2], rkey: match[3] };
}

function asStandardSitePublication(value: unknown): StandardSitePublication {
  return value as StandardSitePublication;
}

function asStandardSiteDocument(value: unknown): StandardSiteDocument {
  return value as StandardSiteDocument;
}

async function getRepoClient(did: string) {
  if (did === env.NEXT_PUBLIC_BSKY_DID) {
    return bsky;
  }

  const pdsUrl = await resolvePds(did);
  return createPdsClient(pdsUrl);
}

async function fetchPublication(atUri: string): Promise<StandardSitePublication> {
  const { did, collection, rkey } = parseAtUri(atUri);
  const repoClient = await getRepoClient(did);

  const publication = await ok(
    repoClient.get("com.atproto.repo.getRecord", {
      params: {
        repo: did as `did:plc:${string}`,
        rkey,
        collection: collection as `${string}.${string}.${string}`,
      },
    }),
  );

  return asStandardSitePublication(publication.value);
}

function isPublishedStandardDocument(record: ComAtprotoRepoListRecords.Record) {
  if (process.env.NODE_ENV === "development") return true;
  const post = asStandardSiteDocument(record.value);
  return !!post.publishedAt;
}

async function fetchStandardDocument(atUri: string): Promise<BlogPost | null> {
  const { did, collection, rkey } = parseAtUri(atUri);
  if (collection !== "site.standard.document") return null;

  const repoClient = await getRepoClient(did);
  const post = await ok(
    repoClient.get("com.atproto.repo.getRecord", {
      params: {
        repo: did as `did:plc:${string}`,
        rkey,
        collection,
      },
    }),
  );

  const document = asStandardSiteDocument(post.value);
  const publication = await fetchPublication(document.site);

  return {
    type: "standard",
    value: document,
    publication,
    uri: post.uri,
    cid: post.cid!,
    isExternal: did !== (env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`),
  };
}

export async function getPosts(): Promise<BlogPost[]> {
  const [publication, documents, externalPosts] = await Promise.all([
    fetchPublication(STANDARD_SITE_PUBLICATION_URI),
    ok(
      bsky.get("com.atproto.repo.listRecords", {
        params: {
          repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
          collection: "site.standard.document",
        },
      }),
    ),
    Promise.all(
      EXTERNAL_POSTS.map(async (atUri) => {
        try {
          return await fetchStandardDocument(atUri);
        } catch (error) {
          console.error(`Failed to fetch external post ${atUri}:`, error);
          return null;
        }
      }),
    ),
  ]);

  const filtered = (documents.records?.filter(isPublishedStandardDocument) ?? []).filter(
    (record) => asStandardSiteDocument(record.value).site === STANDARD_SITE_PUBLICATION_URI,
  ) as (ComAtprotoRepoListRecords.Record & {
    value: StandardSiteDocument;
  })[];

  return [
    ...filtered.map((record) => ({
      type: "standard" as const,
      value: record.value,
      publication,
      uri: record.uri,
      cid: record.cid,
      isExternal: false,
    })),
    ...externalPosts.filter((post): post is BlogPost => post !== null),
  ];
}

export async function getPost(rkey: string): Promise<BlogPost> {
  const externalAtUri = EXTERNAL_POSTS.find((uri) => uri.endsWith(`/${rkey}`));
  if (externalAtUri) {
    const externalPost = await fetchStandardDocument(externalAtUri);
    if (externalPost) return externalPost;
  }

  const post = await ok(
    bsky.get("com.atproto.repo.getRecord", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
        rkey,
        collection: "site.standard.document",
      },
    }),
  );

  const document = asStandardSiteDocument(post.value);

  if (document.site !== STANDARD_SITE_PUBLICATION_URI) {
    const externalPost = await fetchStandardDocument(post.uri);
    if (externalPost) return externalPost;
  }

  const publication = await fetchPublication(document.site);

  return {
    type: "standard",
    value: document,
    publication,
    uri: post.uri,
    cid: post.cid!,
    isExternal: false,
  };
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
      },
    }),
  );
  return posts.records as (ComAtprotoRepoListRecords.Record & {
    value: Record;
  })[];
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
