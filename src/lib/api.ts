import type { Nsid } from "@atcute/lexicons";
import * as Whitewind from "@atcute/whitewind";

import type { NetMmattRightNow } from "../../lexiconTypes";
import { bsky } from "./bsky";
import { env } from "./env";

// Proper TypeScript interfaces
interface ListRecordsRecord<T> {
  uri: string;
  cid: string;
  value: T;
  rkey: string;
  repo: string;
  collection: Nsid;
}

// Type-safe API response interfaces based on actual bsky client structure
interface BskyListRecordsResponse<T> {
  data: {
    records: ListRecordsRecord<T>[];
  };
}

interface BskyGetRecordResponse<T> {
  data: ListRecordsRecord<T>;
}

// Type assertion to bypass strict typing - this is necessary because the bsky client
// is strongly typed but we need to use AT Protocol endpoints
const bskyClient = bsky as {
  get: (
    endpoint: string,
    options: { params: Record<string, unknown> },
  ) => Promise<unknown>;
};

export async function getPosts(): Promise<
  ListRecordsRecord<Whitewind.ComWhtwndBlogEntry.Main>[]
> {
  try {
    const response = await bskyClient.get("com.atproto.repo.listRecords", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID,
        collection: "com.whtwnd.blog.entry",
        // todo: pagination
        // hi this is matt from the forking realm i'm never going to implement pagination
      },
    });

    // Type assertion is safe here because we know the structure from the working code
    const typedResponse =
      response as BskyListRecordsResponse<Whitewind.ComWhtwndBlogEntry.Main>;
    return typedResponse.data.records.filter(drafts);
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    throw new Error("Failed to fetch posts");
  }
}

export async function getLastestStatus(): Promise<
  ListRecordsRecord<NetMmattRightNow.Record> | undefined
> {
  try {
    const response = await bskyClient.get("com.atproto.repo.listRecords", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID,
        collection: "net.mmatt.right.now",
        limit: 1,
      },
    });

    // Type assertion is safe here because we know the structure from the working code
    const typedResponse =
      response as BskyListRecordsResponse<NetMmattRightNow.Record>;
    return typedResponse.data.records[0];
  } catch (error) {
    console.error("Failed to fetch latest status:", error);
    throw new Error("Failed to fetch latest status");
  }
}

export async function getStatuses(): Promise<
  ListRecordsRecord<NetMmattRightNow.Record>[]
> {
  try {
    const response = await bskyClient.get("com.atproto.repo.listRecords", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID,
        collection: "net.mmatt.right.now",
        // todo: pagination
        // hi this is matt from the forking realm i'm never going to implement pagination
      },
    });

    // Type assertion is safe here because we know the structure from the working code
    const typedResponse =
      response as BskyListRecordsResponse<NetMmattRightNow.Record>;
    return typedResponse.data.records;
  } catch (error) {
    console.error("Failed to fetch statuses:", error);
    throw new Error("Failed to fetch statuses");
  }
}

function drafts(
  record: ListRecordsRecord<Whitewind.ComWhtwndBlogEntry.Main>,
): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return record.value.visibility === "public";
}

export async function getPost(
  rkey: string,
): Promise<ListRecordsRecord<Whitewind.ComWhtwndBlogEntry.Main>> {
  try {
    const response = await bskyClient.get("com.atproto.repo.getRecord", {
      params: {
        repo: env.NEXT_PUBLIC_BSKY_DID,
        rkey: rkey,
        collection: "com.whtwnd.blog.entry",
      },
    });

    // Type assertion is safe here because we know the structure from the working code
    const typedResponse =
      response as BskyGetRecordResponse<Whitewind.ComWhtwndBlogEntry.Main>;
    return typedResponse.data;
  } catch (error) {
    console.error(`Failed to fetch post with rkey ${rkey}:`, error);
    throw new Error(`Failed to fetch post with rkey ${rkey}`);
  }
}
