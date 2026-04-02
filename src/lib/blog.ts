import { AtpAgent } from "@atproto/api";
import { type ComAtprotoRepoListRecords } from "@atcute/atproto";
import { ok } from "@atcute/client";
import type { PubLeafletDocument, PubLeafletPublication } from "@atcute/leaflet";
import { ComWhtwndBlogEntry } from "@atcute/whitewind";
import {
  COLLECTIONS,
  DocumentSchema,
  PublicationSchema,
  type Document as StandardSiteDocument,
} from "@bryanguffey/astro-standard-site";

import { bsky, createPdsClient, resolvePds } from "./bsky";
import { env } from "./env";

const EXTERNAL_POSTS = [
  "at://did:plc:iwhuynr6mm6xxuh25o4do2tx/pub.leaflet.document/3lzlwe6puis2l",
];
const POSTS_CACHE_TTL_MS = env.NODE_ENV === "development" ? 30_000 : 300_000;

const publicationUrlCache = new Map<string, Promise<string>>();

let blogCache:
  | {
      expiresAt: number;
      value: Promise<BlogIndex>;
    }
  | undefined;

type BlogIndex = {
  posts: BlogPost[];
  byRkey: Map<string, BlogPost>;
};

type BlogPostBase = {
  rkey: string;
  uri: string;
  cid: string;
  title: string;
  description?: string;
  createdAt?: string;
  isExternal?: boolean;
  basePath?: string;
};

type StandardSiteBlogDocument = StandardSiteDocument & {
  uri: string;
  cid: string;
  textContent?: string;
  content?: unknown;
};

export type BlogPost =
  | (BlogPostBase & {
      type: "whitewind";
      value: ComWhtwndBlogEntry.Main;
    })
  | (BlogPostBase & {
      type: "leaflet";
      value: PubLeafletDocument.Main;
    })
  | (BlogPostBase & {
      type: "standard-site";
      value: StandardSiteBlogDocument;
    });

type AtUriParts = {
  did: string;
  collection: string;
  rkey: string;
};

function parseAtUri(atUri: string): AtUriParts {
  const match = atUri.match(/^at:\/\/(did:[^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) {
    throw new Error(`Invalid AT URI: ${atUri}`);
  }

  return { did: match[1], collection: match[2], rkey: match[3] };
}

function getRkeyFromUri(uri: string) {
  return uri.split("/").pop() ?? "";
}

function isPublicWhitewindPost(record: ComAtprotoRepoListRecords.Record) {
  if (env.NODE_ENV === "development") {
    return true;
  }

  const post = record.value as ComWhtwndBlogEntry.Main;
  return post.visibility === "public";
}

function isPublishedLeafletPost(record: ComAtprotoRepoListRecords.Record) {
  if (env.NODE_ENV === "development") {
    return true;
  }

  const post = record.value as PubLeafletDocument.Main;
  return Boolean(post.publishedAt);
}

function normalizeWhitewind(
  record: ComAtprotoRepoListRecords.Record & { value: ComWhtwndBlogEntry.Main },
): BlogPost {
  const [title = "Untitled", ...descriptionParts] = record.value.title?.split(" || ") ?? [];
  const description = descriptionParts.join(" || ") || undefined;

  return {
    type: "whitewind",
    value: record.value,
    uri: record.uri,
    cid: record.cid,
    rkey: getRkeyFromUri(record.uri),
    title,
    description,
    createdAt: record.value.createdAt,
    isExternal: false,
  };
}

function normalizeLeaflet(post: {
  value: PubLeafletDocument.Main;
  uri: string;
  cid: string;
  basePath?: string;
  isExternal?: boolean;
}): BlogPost {
  return {
    type: "leaflet",
    value: post.value,
    uri: post.uri,
    cid: post.cid,
    rkey: getRkeyFromUri(post.uri),
    title: post.value.title,
    description: post.value.description,
    createdAt: post.value.publishedAt,
    basePath: post.basePath,
    isExternal: post.isExternal,
  };
}

async function resolveStandardSiteBasePath(site: string, path?: string) {
  let baseUrl = site.replace(/\/$/, "");

  if (site.startsWith("at://")) {
    const cachedBaseUrl = publicationUrlCache.get(site);
    if (cachedBaseUrl) {
      baseUrl = await cachedBaseUrl;
    } else {
      const baseUrlPromise = (async () => {
        const { did, collection, rkey } = parseAtUri(site);
        if (collection !== COLLECTIONS.PUBLICATION) {
          return site.replace(/\/$/, "");
        }

        const pdsUrl = await resolvePds(did);
        const pdsClient = createPdsClient(pdsUrl);
        const publication = await ok(
          pdsClient.get("com.atproto.repo.getRecord", {
            params: {
              repo: did as `did:plc:${string}`,
              rkey,
              collection: COLLECTIONS.PUBLICATION,
            },
          }),
        );

        const parsedPublication = PublicationSchema.safeParse(publication.value);
        if (!parsedPublication.success) {
          return site.replace(/\/$/, "");
        }

        return parsedPublication.data.url.replace(/\/$/, "");
      })();

      publicationUrlCache.set(site, baseUrlPromise);
      baseUrl = await baseUrlPromise;
    }
  }

  if (!path) {
    return baseUrl;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

async function normalizeStandardSite(record: {
  id: string;
  uri: string;
  cid: string;
  value: StandardSiteDocument;
}): Promise<BlogPost> {
  return {
    type: "standard-site",
    value: {
      ...record.value,
      uri: record.uri,
      cid: record.cid,
    },
    uri: record.uri,
    cid: record.cid,
    rkey: record.id,
    title: record.value.title ?? "Untitled",
    description: record.value.description,
    createdAt: record.value.updatedAt ?? record.value.publishedAt,
    isExternal: false,
    basePath: await resolveStandardSiteBasePath(record.value.site, record.value.path),
  };
}

async function getStandardSitePosts(): Promise<BlogPost[]> {
  try {
    const agent = new AtpAgent({ service: env.BSKY_PDS_URL });
    const response = await agent.com.atproto.repo.listRecords({
      repo: env.PUBLIC_BSKY_DID as `did:plc:${string}`,
      collection: COLLECTIONS.DOCUMENT,
      limit: 100,
    });
    const records = response.data.records ?? [];

    const posts = await Promise.all(
      records.map(async (record) => {
        const parsed = DocumentSchema.safeParse(record.value);
        if (!parsed.success) {
          return null;
        }

        return normalizeStandardSite({
          id: parseAtUri(record.uri).rkey,
          uri: record.uri,
          cid: record.cid,
          value: parsed.data,
        });
      }),
    );

    return posts.filter((post): post is BlogPost => post !== null);
  } catch {
    return [];
  }
}

async function fetchExternalPost(atUri: string): Promise<BlogPost | null> {
  const { did, collection, rkey } = parseAtUri(atUri);
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
    let basePath: string | undefined;

    if (leafletDoc.publication) {
      try {
        const publicationParts = parseAtUri(leafletDoc.publication);
        const publicationPdsUrl = await resolvePds(publicationParts.did);
        const publicationClient = createPdsClient(publicationPdsUrl);
        const publication = await ok(
          publicationClient.get("com.atproto.repo.getRecord", {
            params: {
              repo: publicationParts.did as `did:plc:${string}`,
              rkey: publicationParts.rkey,
              collection: "pub.leaflet.publication",
            },
          }),
        );
        basePath = (publication.value as PubLeafletPublication.Main).base_path;
      } catch {
        basePath = undefined;
      }
    }

    return normalizeLeaflet({
      value: leafletDoc,
      uri: post.uri,
      cid: post.cid ?? "",
      basePath,
      isExternal: true,
    });
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

    return normalizeWhitewind({
      ...post,
      cid: post.cid ?? "",
      value: post.value as ComWhtwndBlogEntry.Main,
    });
  }

  return null;
}

function getCreatedAtTimestamp(createdAt?: string) {
  if (!createdAt) {
    return 0;
  }

  const timestamp = Date.parse(createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function loadBlogIndex(): Promise<BlogIndex> {
  const [standardSitePosts, whitewindPosts, leafletPosts, externalPosts] = await Promise.all([
    getStandardSitePosts(),
    ok(
      bsky.get("com.atproto.repo.listRecords", {
        params: {
          repo: env.PUBLIC_BSKY_DID as `did:plc:${string}`,
          collection: "com.whtwnd.blog.entry",
        },
      }),
    ),
    ok(
      bsky.get("com.atproto.repo.listRecords", {
        params: {
          repo: env.PUBLIC_BSKY_DID as `did:plc:${string}`,
          collection: "pub.leaflet.document",
        },
      }),
    ),
    Promise.all(
      EXTERNAL_POSTS.map(async (atUri) => {
        try {
          return await fetchExternalPost(atUri);
        } catch (error) {
          console.error(`Failed to fetch external post ${atUri}:`, error);
          return null;
        }
      }),
    ),
  ]);

  const prioritizedPosts = [
    ...standardSitePosts,
    ...(
      whitewindPosts.records?.filter(isPublicWhitewindPost) ?? []
    ).map((record) =>
      normalizeWhitewind(
        record as ComAtprotoRepoListRecords.Record & {
          value: ComWhtwndBlogEntry.Main;
        },
      ),
    ),
    ...(
      leafletPosts.records?.filter(isPublishedLeafletPost) ?? []
    ).map((record) =>
      normalizeLeaflet({
        value: record.value as PubLeafletDocument.Main,
        uri: record.uri,
        cid: record.cid,
      }),
    ),
    ...externalPosts.filter((post): post is BlogPost => post !== null),
  ];

  const byRkey = new Map<string, BlogPost>();
  for (const post of prioritizedPosts) {
    if (!byRkey.has(post.rkey)) {
      byRkey.set(post.rkey, post);
    }
  }

  const posts = Array.from(byRkey.values()).sort(
    (left, right) =>
      getCreatedAtTimestamp(right.createdAt) - getCreatedAtTimestamp(left.createdAt),
  );

  return { posts, byRkey };
}

async function getBlogIndex(): Promise<BlogIndex> {
  if (blogCache && blogCache.expiresAt > Date.now()) {
    return blogCache.value;
  }

  const value = loadBlogIndex().catch((error) => {
    blogCache = undefined;
    throw error;
  });

  blogCache = {
    expiresAt: Date.now() + POSTS_CACHE_TTL_MS,
    value,
  };

  return value;
}

export async function getPosts(): Promise<BlogPost[]> {
  return (await getBlogIndex()).posts;
}

export async function findPost(rkey: string) {
  if (!rkey) {
    return undefined;
  }

  return (await getBlogIndex()).byRkey.get(rkey);
}

export async function getPost(rkey: string): Promise<BlogPost> {
  const post = await findPost(rkey);
  if (!post) {
    throw new Error(`Post not found for rkey ${rkey}`);
  }

  return post;
}

export function clearBlogCache() {
  blogCache = undefined;
  publicationUrlCache.clear();
}
