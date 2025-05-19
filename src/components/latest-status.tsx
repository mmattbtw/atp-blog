import Link from "next/link";

import { getLastestStatus } from "#/lib/api";

import { Paragraph, Title } from "./typography";

export default async function LatestStatus() {
  const status = await getLastestStatus();

  return (
    <div className="flex flex-col w-full dark:border-white border-black border-2 rounded-lg p-4">
      <div className="flex flex-row justify-between items-center">
        <div>
          <Title level="h4">Current Status:</Title>
          <Paragraph>{status.value.text}</Paragraph>
          <Paragraph className="text-sm text-gray-500">
            {new Date(status.value.createdAt).toLocaleString()} -{" "}
            <Link href="/right/now" className="underline">
              View all statuses
            </Link>
          </Paragraph>
        </div>
        {status.value.emoji && <p className="text-7xl">{status.value.emoji}</p>}
      </div>
    </div>
  );
}
