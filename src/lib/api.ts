import { type ComAtprotoRepoListRecords } from "@atcute/atproto";
import { ok } from "@atcute/client";

import type { Record } from "../../lexiconTypes/types/net/mmatt/right/now";
import type { Record as CarRecord } from "../../lexiconTypes/types/net/mmatt/vitals/car";
import { bsky } from "./bsky";
import { env } from "./env";

type TypedRepoRecord<T> = ComAtprotoRepoListRecords.Record & { value: T };
type RepoCollection = `${string}.${string}.${string}`;

async function listRepoRecords<T>(
  collection: RepoCollection,
  options?: {
    cursor?: string;
    limit?: number;
  },
) {
  const response = await ok(
    bsky.get("com.atproto.repo.listRecords", {
      params: {
        repo: env.PUBLIC_BSKY_DID as `did:plc:${string}`,
        collection,
        ...options,
      },
    }),
  );

  return {
    records: response.records as TypedRepoRecord<T>[],
    cursor: response.cursor,
  };
}

export async function getLatestStatus() {
  const { records } = await listRepoRecords<Record>("net.mmatt.right.now", { limit: 1 });
  return records[0];
}

export async function getStatuses() {
  return (await listRepoRecords<Record>("net.mmatt.right.now")).records;
}

export async function getCarRecords(cursor?: string) {
  const cars = await listRepoRecords<CarRecord>("net.mmatt.vitals.car", {
    limit: 100,
    cursor,
  });

  return {
    records: cars.records,
    cursor: cars.cursor,
  };
}
