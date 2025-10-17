"use client";

import { useEffect, useState } from "react";
import { ComWhtwndBlogEntry } from "@atcute/whitewind";

import { bsky } from "#/lib/bsky";
import { env } from "#/lib/env";

import { Record as BlueskyPostRecord } from "../../lexiconTypes/types/app/bsky/feed/post";
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

interface ContentItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LetterboxdEntry {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

export default function InfoBox() {
  const [carInfo, setCarInfo] = useState<CarRecord | null>(null);
  const [blogPost, setBlogPost] = useState<ComWhtwndBlogEntry.Main | null>(
    null,
  );
  const [blogPostRkey, setBlogPostRkey] = useState<string | null>(null);
  const [blueskyPost, setBlueskyPost] = useState<BlueskyPostRecord | null>(
    null,
  );
  const [blueskyPostRkey, setBlueskyPostRkey] = useState<string | null>(null);
  const [tealPlay, setTealPlay] = useState<TealPlayRecord | null>(null);
  const [letterboxdEntry, setLetterboxdEntry] =
    useState<LetterboxdEntry | null>(null);
  const [nowEntry, setNowEntry] = useState<NowRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi | undefined>();

  const contentItems: ContentItem[] = [
    // Car Info
    ...(carInfo
      ? [
          {
            id: "car",
            title: "Car Info",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <p>
                  Range: <SlidingNumber number={carInfo.carFuelRange} inView />
                </p>
                <p>
                  Fuel:{" "}
                  <SlidingNumber
                    number={carInfo.carPercentFuelRemaining}
                    decimalPlaces={1}
                    inView
                  />
                </p>
                <p>
                  Remaining:{" "}
                  <SlidingNumber
                    number={carInfo.amountRemaining}
                    decimalPlaces={1}
                    inView
                  />
                </p>
                <p>
                  Distance:{" "}
                  <SlidingNumber number={carInfo.carTraveledDistance} inView />
                </p>
              </div>
            ),
          },
        ]
      : []),

    // Blog Post
    ...(blogPost && blogPostRkey
      ? [
          {
            id: "blog",
            title: "Latest Blog Post",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <Link href={`/post/${blogPostRkey}`}>
                  {blogPost.title?.split(" || ")[0] || "Untitled Post"}
                  <br />
                </Link>
                <p className="text-gray-600 dark:text-gray-400">
                  {blogPost.title?.split(" || ")[1]}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(blogPost.createdAt ?? "").toLocaleDateString()}
                </p>
              </div>
            ),
          },
        ]
      : []),

    // Bluesky Post
    ...(blueskyPost && blueskyPostRkey
      ? [
          {
            id: "bluesky",
            title: "Latest Bluesky Post",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <Link
                  href={`https://bsky.app/profile/${env.NEXT_PUBLIC_BSKY_DID}/post/${blueskyPostRkey}`}
                >
                  {blueskyPost.text.length > 100
                    ? `${blueskyPost.text.substring(0, 100)}...`
                    : blueskyPost.text}
                </Link>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(blueskyPost.createdAt).toLocaleDateString()}
                </p>
              </div>
            ),
          },
        ]
      : []),

    // Teal.fm Play
    ...(tealPlay
      ? [
          {
            id: "teal",
            title: "Latest Teal.fm Play",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <p className="font-medium">
                  {tealPlay.trackName || "Unknown Track"}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  by{" "}
                  {tealPlay.artistNames?.[0] ||
                    tealPlay.artists?.[0]?.artistName ||
                    "Unknown Artist"}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {tealPlay.playedTime
                    ? new Date(tealPlay.playedTime).toLocaleDateString()
                    : "Unknown date"}
                </p>
              </div>
            ),
          },
        ]
      : []),

    // Letterboxd Entry
    ...(letterboxdEntry
      ? [
          {
            id: "letterboxd",
            title: "Latest Letterboxd Watch",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <Link href={letterboxdEntry.link}>{letterboxdEntry.title}</Link>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(letterboxdEntry.pubDate).toLocaleDateString()}
                </p>
                {letterboxdEntry.description && (
                  <p className="text-gray-600 dark:text-gray-400">
                    {(() => {
                      const cleanDescription =
                        letterboxdEntry.description.replace(/<[^>]*>/g, "");
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
    ...(nowEntry
      ? [
          {
            id: "now",
            title: "Latest Status",
            content: (
              <div className="space-y-1 text-xs text-black dark:text-white">
                <p className="font-medium">
                  {nowEntry.emoji && (
                    <span className="mr-1">{nowEntry.emoji}</span>
                  )}
                  {nowEntry.text}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {new Date(nowEntry.createdAt).toLocaleDateString()}
                </p>
              </div>
            ),
          },
        ]
      : []),
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch car info
        const cars = await bsky.get("com.atproto.repo.listRecords", {
          params: {
            repo: env.NEXT_PUBLIC_BSKY_DID,
            collection: "net.mmatt.vitals.car",
            limit: 1,
          },
        });
        if (cars.data.records.length > 0) {
          setCarInfo(cars.data.records[0].value as CarRecord);
        }

        // Fetch latest blog post (com.whtwnd.blog.entry with visibility = public)
        try {
          const blog = await bsky.get("com.atproto.repo.listRecords", {
            params: {
              repo: env.NEXT_PUBLIC_BSKY_DID,
              collection: "com.whtwnd.blog.entry",
              limit: 10,
            },
          });
          const publicPost = blog.data.records.find((record) => {
            const value = record.value as ComWhtwndBlogEntry.Main;
            return value.visibility === "public";
          });
          if (publicPost) {
            setBlogPost(publicPost.value as ComWhtwndBlogEntry.Main);
            setBlogPostRkey(publicPost.uri.split("/").pop() || null);
          }
        } catch {
          console.log("Blog collection not found or accessible");
        }

        // Fetch latest Bluesky post (non-reply)
        try {
          const bluesky = await bsky.get("com.atproto.repo.listRecords", {
            params: {
              repo: env.NEXT_PUBLIC_BSKY_DID,
              collection: "app.bsky.feed.post",
              limit: 10,
            },
          });
          // Find the first post that is not a reply (doesn't have reply field)
          const nonReplyPost = bluesky.data.records.find((record) => {
            const value = record.value as BlueskyPostRecord;
            return !value.reply;
          });
          if (nonReplyPost) {
            setBlueskyPost(nonReplyPost.value as BlueskyPostRecord);
            setBlueskyPostRkey(nonReplyPost.uri.split("/").pop() || null);
          }
        } catch {
          console.log("Bluesky posts not found or accessible");
        }

        // Fetch latest Teal.fm play
        try {
          const teal = await bsky.get("com.atproto.repo.listRecords", {
            params: {
              repo: env.NEXT_PUBLIC_BSKY_DID,
              collection: "fm.teal.alpha.feed.play",
              limit: 1,
            },
          });
          if (teal.data.records.length > 0) {
            setTealPlay(teal.data.records[0].value as TealPlayRecord);
          }
        } catch {
          console.log("Teal.fm plays not found or accessible");
        }

        // Fetch latest Letterboxd entry from RSS
        try {
          const response = await fetch("/api/letterboxd-rss");
          if (response.ok) {
            const data = await response.json();
            if (data.entries && data.entries.length > 0) {
              setLetterboxdEntry(data.entries[0]);
            }
          }
        } catch {
          console.log("Letterboxd RSS not accessible");
        }

        // Fetch latest statuslog entry (net.mmatt.right.now)
        try {
          const now = await bsky.get("com.atproto.repo.listRecords", {
            params: {
              repo: env.NEXT_PUBLIC_BSKY_DID,
              collection: "net.mmatt.right.now",
              limit: 1,
            },
          });
          if (now.data.records.length > 0) {
            setNowEntry(now.data.records[0].value as NowRecord);
          }
        } catch {
          console.log("Statuslog entries not found or accessible");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-cycle through content every 5 seconds
  useEffect(() => {
    if (!api || contentItems.length <= 1) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api, contentItems.length]);

  if (loading) {
    return (
      <div className="w-48 h-48 dark:border-white border-black border-2 rounded-lg p-3 bg-white dark:bg-black overflow-hidden">
        <div className="animate-pulse h-full flex flex-col">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="space-y-1 flex-1">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (contentItems.length === 0) {
    return;
  }

  return (
    <div className="w-48 h-48 dark:border-white border-black border-2 rounded-lg bg-white dark:bg-black overflow-hidden">
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
