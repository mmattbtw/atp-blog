import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { NowList } from "#/components/now-list";
import { Paragraph, Title } from "#/components/typography";

import me from "../../../assets/matt.jpeg";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://mmatt.net"),
  title: "Right Now - mmatt.net",
  description: "its- its like its like. <_< ^_^ >_>",
  other: {
    "fediverse:creator": "@matt@social.lol",
  },
};

export default function RightNowPage() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-dvh p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-[600px]">
        <Link
          href="/"
          className="hover:underline hover:underline-offset-4 font-medium"
        >
          <ArrowLeftIcon className="inline size-4 align-middle mb-px mr-1" />
          Back
        </Link>
        <div className="self-center flex flex-col">
          <Image
            src={me}
            alt="Photo of Matt Morris, red hair, glasses, holding his iPhone in the mirror, taking a picture of himself."
            width={100}
            height={100}
            className="rounded-lg"
          />
        </div>

        <Title level="h2">matt: right now</Title>
        <Paragraph>
          view on{" "}
          <a
            href="https://bsky.app/profile/did:plc:rwb72l7iwkraojrbrbwitnkd"
            className="underline"
          >
            Bluesky
          </a>{" "}
          and{" "}
          <a href="https://status.lol/matt" className="underline">
            status.lol
          </a>
          .
        </Paragraph>
        <div className="flex flex-col gap-4 w-full">
          <NowList />
        </div>
      </main>
    </div>
  );
}
