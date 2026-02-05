import { type AppBskyFeedPost } from "@atcute/bluesky";
import { ok } from "@atcute/client";

import { getPosts } from "#/lib/api";
import { bsky } from "#/lib/bsky";
import { env } from "#/lib/env";

import { Record as TealPlayRecord } from "../../lexiconTypes/types/fm/teal/alpha/feed/play";
import { Record as NowRecord } from "../../lexiconTypes/types/net/mmatt/right/now";
import { Record as CarRecord } from "../../lexiconTypes/types/net/mmatt/vitals/car";
import InfoBoxClient from "./info-box-client";

// Revalidate every hour (3600 seconds)
export const revalidate = 3600;

interface LetterboxdEntry {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

interface InfoBoxData {
  carInfo: CarRecord | null;
  blogPost: {
    title: string;
    description: string;
    createdAt: string;
  } | null;
  blogPostRkey: string | null;
  blueskyPost: AppBskyFeedPost.Main | null;
  blueskyPostRkey: string | null;
  tealPlay: TealPlayRecord | null;
  letterboxdEntry: LetterboxdEntry | null;
  nowEntry: NowRecord | null;
}

async function fetchLetterboxdData(): Promise<LetterboxdEntry | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/letterboxd-rss`,
    );
    if (response.ok) {
      const data = await response.json();
      if (data.entries && data.entries.length > 0) {
        return data.entries[0];
      }
    }
  } catch {
    console.log("Letterboxd RSS not accessible");
  }
  return null;
}

export default async function InfoBox() {
  const data: InfoBoxData = {
    carInfo: null,
    blogPost: null,
    blogPostRkey: null,
    blueskyPost: null,
    blueskyPostRkey: null,
    tealPlay: null,
    letterboxdEntry: null,
    nowEntry: null,
  };

  try {
    // Fetch car info
    const cars = await ok(
      bsky.get("com.atproto.repo.listRecords", {
        params: {
          repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
          collection: "net.mmatt.vitals.car",
          limit: 1,
        },
      }),
    );
    if (cars.records.length > 0) {
      data.carInfo = cars.records[0].value as CarRecord;
    }

    // Fetch latest blog post using getPosts (includes WhiteWind, Leaflet, and external posts)
    try {
      const posts = await getPosts();
      console.log(posts);
      // sort posts by createdAt descending
      // convert leaflet "publishedAt" to "createdAt"
      // make a new array of posts with the createdAt field
      const newPosts = posts.map((post) => {
        if (post.type === "leaflet") {
          return {
            ...post,
            createdAt: post.value.publishedAt ?? "",
          };
        }
        return {
          ...post,
          createdAt: post.value.createdAt ?? "",
        };
      });
      const sortedPosts = newPosts.sort((a, b) => {
        return new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime();
      });
      if (sortedPosts[0].type === "whitewind") {
      data.blogPost = {
        title: sortedPosts[0].value.title?.split(" || ")[0] || "Untitled Post",
        description: sortedPosts[0].value.title?.split(" || ")[1] || "",
        createdAt: sortedPosts[0].value.createdAt || "",
      };
      data.blogPostRkey = sortedPosts[0].uri.split("/").pop() || null;
    } else {
      data.blogPost = {
        title: sortedPosts[0].value.title || "Untitled Post",
        description: sortedPosts[0].value.description || "",
        createdAt: sortedPosts[0].value.publishedAt || "",
      };
      data.blogPostRkey = sortedPosts[0].uri.split("/").pop() || null;
    }
    } catch {
      console.log("Blog posts not found or accessible");
    }

    // Fetch latest Bluesky post (non-reply)
    try {
      const bluesky = await ok(
        bsky.get("com.atproto.repo.listRecords", {
          params: {
            repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
            collection: "app.bsky.feed.post",
            limit: 10,
          },
        }),
      );
      // Find the first post that is not a reply (doesn't have reply field)
      const nonReplyPost = bluesky.records.find((record) => {
        const value = record.value as AppBskyFeedPost.Main;
        return !value.reply;
      });
      if (nonReplyPost) {
        data.blueskyPost = nonReplyPost.value as AppBskyFeedPost.Main;
        data.blueskyPostRkey = nonReplyPost.uri.split("/").pop() || null;
      }
    } catch {
      console.log("Bluesky posts not found or accessible");
    }

    // Fetch latest Teal.fm play
    try {
      const teal = await ok(
        bsky.get("com.atproto.repo.listRecords", {
          params: {
            repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
            collection: "fm.teal.alpha.feed.play",
            limit: 1,
          },
        }),
      );
      if (teal.records.length > 0) {
        data.tealPlay = teal.records[0].value as TealPlayRecord;
      }
    } catch {
      console.log("Teal.fm plays not found or accessible");
    }

    // Fetch latest Letterboxd entry from RSS
    data.letterboxdEntry = await fetchLetterboxdData();

    // Fetch latest statuslog entry (net.mmatt.right.now)
    try {
      const now = await ok(
        bsky.get("com.atproto.repo.listRecords", {
          params: {
            repo: env.NEXT_PUBLIC_BSKY_DID as `did:plc:${string}`,
            collection: "net.mmatt.right.now",
            limit: 1,
          },
        }),
      );
      if (now.records.length > 0) {
        data.nowEntry = now.records[0].value as NowRecord;
      }
    } catch {
      console.log("Statuslog entries not found or accessible");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  return <InfoBoxClient data={data} />;
}
