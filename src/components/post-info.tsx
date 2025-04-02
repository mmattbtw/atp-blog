import { ClockIcon, NotepadTextIcon } from "lucide-react";
import Image from "next/image";
import readingTime from "reading-time";

import me from "#/assets/matt.jpeg";
import { date } from "#/lib/date";
import { env } from "#/lib/env";

import { Paragraph } from "./typography";

export function PostInfo({
  createdAt,
  content,
  includeAuthor = false,
  className,
  children,
  desc,
}: {
  createdAt?: string;
  content: string;
  includeAuthor?: boolean;
  className?: string;
  children?: React.ReactNode;
  desc?: string;
}) {
  return (
    <>
      {desc && (
        <Paragraph className={className}>
          <NotepadTextIcon className="text-inherit inline size-3.5 mb-0.5" />{" "}
          {desc}
        </Paragraph>
      )}
      <Paragraph className={className}>
        {includeAuthor && (
          <>
            <Image
              width={14}
              height={14}
              src={me}
              alt="Matt's profile picture"
              className="inline rounded-full mr-1.5 mb-0.5"
            />
            <a
              href={`https://bsky.app/profile/${env.NEXT_PUBLIC_BSKY_DID}`}
              className="hover:underline hover:underline-offset-4"
            >
              Matt
            </a>{" "}
            &middot;{" "}
          </>
        )}
        {createdAt && (
          <>
            <time dateTime={createdAt}>{date(new Date(createdAt))}</time>{" "}
            &middot;{" "}
          </>
        )}
        <ClockIcon className="text-inherit inline size-3.5 mb-0.5" />{" "}
        {readingTime(content).text}
        {children}
      </Paragraph>
    </>
  );
}
