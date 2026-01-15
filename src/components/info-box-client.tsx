"use client";

import { useEffect, useState } from "react";
import { type AppBskyFeedPost } from "@atcute/bluesky";
import { ComWhtwndBlogEntry } from "@atcute/whitewind";

import { env } from "#/lib/env";

import { Record as TealPlayRecord } from "../../lexiconTypes/types/fm/teal/alpha/feed/play";
import { Record as NowRecord } from "../../lexiconTypes/types/net/mmatt/right/now";
import { Record as CarRecord } from "../../lexiconTypes/types/net/mmatt/vitals/car";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "./ui/carousel";
import Link from "./ui/link";
import { SlidingNumber } from "./ui/shadcn-io/sliding-number";

interface LetterboxdEntry {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

interface InfoBoxData {
  carInfo: CarRecord | null;
  blogPost: ComWhtwndBlogEntry.Main | null;
  blogPostRkey: string | null;
  blueskyPost: AppBskyFeedPost.Main | null;
  blueskyPostRkey: string | null;
  tealPlay: TealPlayRecord | null;
  letterboxdEntry: LetterboxdEntry | null;
  nowEntry: NowRecord | null;
}

interface ContentItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface InfoBoxClientProps {
  data: InfoBoxData;
}

export default function InfoBoxClient({ data }: InfoBoxClientProps) {
  const [api, setApi] = useState<CarouselApi | undefined>();

  const contentItems: ContentItem[] = [
    // Car Info
    ...(data.carInfo
      ? [
          {
            id: "car",
            title: "My Car",
            content: (
              <div className="text-xs text-black dark:text-white">
                <p>
                  Range:{" "}
                  <SlidingNumber number={data.carInfo.carFuelRange} inView />
                </p>
                <p>
                  Fuel:{" "}
                  <SlidingNumber
                    number={data.carInfo.carPercentFuelRemaining}
                    decimalPlaces={1}
                    inView
                  />
                </p>
                <p>
                  Remaining:{" "}
                  <SlidingNumber
                    number={data.carInfo.amountRemaining}
                    decimalPlaces={1}
                    inView
                  />
                </p>
                <p>
                  Distance:{" "}
                  <SlidingNumber
                    number={data.carInfo.carTraveledDistance}
                    inView
                  />
                </p>
                <Link href="/car" className="underline">
                  View Car Stats
                </Link>
              </div>
            ),
          },
        ]
      : []),

    // Blog Post
    ...(data.blogPost && data.blogPostRkey
      ? [
          {
            id: "blog",
            title: "Latest Blog Post",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <Link href={`/post/${data.blogPostRkey}`}>
                  {data.blogPost.title?.split(" || ")[0] || "Untitled Post"}
                  <br />
                </Link>
                <p className="text-gray-600 dark:text-gray-400">
                  {data.blogPost.title?.split(" || ")[1]}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(data.blogPost.createdAt ?? "").toLocaleDateString()}
                </p>
              </div>
            ),
          },
        ]
      : []),

    // Bluesky Post
    ...(data.blueskyPost && data.blueskyPostRkey
      ? [
          {
            id: "bluesky",
            title: "Latest Bluesky Post",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <Link
                  href={`https://bsky.app/profile/${env.NEXT_PUBLIC_BSKY_DID}/post/${data.blueskyPostRkey}`}
                >
                  {data.blueskyPost.text.length > 100
                    ? `${data.blueskyPost.text.substring(0, 100)}...`
                    : data.blueskyPost.text}
                </Link>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(data.blueskyPost.createdAt).toLocaleDateString()}
                </p>
              </div>
            ),
          },
        ]
      : []),

    // Teal.fm Play
    ...(data.tealPlay
      ? [
          {
            id: "teal",
            title: "Latest Teal.fm Play",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <p className="font-medium">
                  {data.tealPlay.trackName || "Unknown Track"}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  by{" "}
                  {data.tealPlay.artistNames?.[0] ||
                    data.tealPlay.artists?.[0]?.artistName ||
                    "Unknown Artist"}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {data.tealPlay.playedTime
                    ? new Date(data.tealPlay.playedTime).toLocaleDateString()
                    : "Unknown date"}
                </p>
              </div>
            ),
          },
        ]
      : []),

    // Letterboxd Entry
    ...(data.letterboxdEntry
      ? [
          {
            id: "letterboxd",
            title: "Latest Letterboxd Watch",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <Link href={data.letterboxdEntry.link}>
                  {data.letterboxdEntry.title}
                </Link>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(data.letterboxdEntry.pubDate).toLocaleDateString()}
                </p>
                {data.letterboxdEntry.description && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {(() => {
                      const cleanDescription =
                        data.letterboxdEntry.description.replace(
                          /<[^>]*>/g,
                          "",
                        );
                      return cleanDescription.length > 80
                        ? `${cleanDescription.substring(0, 80)}...`
                        : cleanDescription;
                    })()}
                  </p>
                )}
              </div>
            ),
          },
        ]
      : []),

    // Statuslog Entry
    ...(data.nowEntry
      ? [
          {
            id: "now",
            title: "Latest Status",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <p className="font-medium">
                  {data.nowEntry.emoji && (
                    <span className="mr-1">{data.nowEntry.emoji}</span>
                  )}
                  {data.nowEntry.text}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(data.nowEntry.createdAt).toLocaleDateString()}
                </p>
              </div>
            ),
          },
        ]
      : []),
  ];

  // Auto-cycle through content every 5 seconds
  useEffect(() => {
    if (!api || contentItems.length <= 1) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api, contentItems.length]);

  if (contentItems.length === 0) {
    return null;
  }

  return (
    <div className="w-56 h-48 dark:border-white border-black border-2 rounded-lg bg-white dark:bg-black overflow-hidden">
      <Carousel className="w-full h-full" opts={{ loop: true }} setApi={setApi}>
        <CarouselContent className="h-full">
          {contentItems.map((item) => (
            <CarouselItem key={item.id} className="h-full px-6 py-3">
              <div className="flex flex-col h-full">
                <h2 className="text-sm font-bold mb-2 text-black dark:text-white">
                  {item.title}
                </h2>
                <div className="flex-1 overflow-hidden">{item.content}</div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
