import {
  type ComAtprotoRepoListRecords,
  type ComWhtwndBlogEntry,
} from "@atcute/client/lexicons";

import { NetMmattRightNow } from "../../lexiconTypes";
import { bsky } from "./bsky";
import { env } from "./env";

export async function getPosts() {
  const posts = await bsky.get("com.atproto.repo.listRecords", {
    params: {
      repo: env.NEXT_PUBLIC_BSKY_DID,
      collection: "com.whtwnd.blog.entry",
      // todo: pagination
      // hi this is matt from the forking realm i'm never going to implement pagination
    },
  });
  return posts.data.records.filter(
    drafts,
  ) as (ComAtprotoRepoListRecords.Record & {
    value: ComWhtwndBlogEntry.Record;
  })[];
}

export async function getLastestStatus() {
  const posts = await bsky.get("com.atproto.repo.listRecords", {
    params: {
      repo: env.NEXT_PUBLIC_BSKY_DID,
      collection: "net.mmatt.right.now",
      limit: 1,
    },
  });
  return posts.data.records[0] as ComAtprotoRepoListRecords.Record & {
    value: NetMmattRightNow.Record;
  };
}

export async function getStatuses() {
  const posts = await bsky.get("com.atproto.repo.listRecords", {
    params: {
      repo: env.NEXT_PUBLIC_BSKY_DID,
      collection: "net.mmatt.right.now",
      // todo: pagination
      // hi this is matt from the forking realm i'm never going to implement pagination
    },
  });
  return posts.data.records as (ComAtprotoRepoListRecords.Record & {
    value: NetMmattRightNow.Record;
  })[];
}

function drafts(record: ComAtprotoRepoListRecords.Record) {
  if (process.env.NODE_ENV === "development") return true;
  const post = record.value as ComWhtwndBlogEntry.Record;
  return post.visibility === "public";
}

export async function getPost(rkey: string) {
  const post = await bsky.get("com.atproto.repo.getRecord", {
    params: {
      repo: env.NEXT_PUBLIC_BSKY_DID,
      rkey: rkey,
      collection: "com.whtwnd.blog.entry",
    },
  });

  return post.data as ComAtprotoRepoListRecords.Record & {
    value: ComWhtwndBlogEntry.Record;
  };
}
