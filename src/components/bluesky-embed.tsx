"use client";

import { useEffect, useId, useState } from "react";

const EMBED_URL = "https://embed.bsky.app";

export function BlueskyPostEmbed({ uri }: { uri: string }) {
  const id = useId();
  const [height, setHeight] = useState(320);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
    const handleMessage = (event: MessageEvent<{ id?: string; height?: number }>) => {
      if (event.origin !== EMBED_URL) {
        return;
      }

      if (event.data?.id !== id) {
        return;
      }

      if (typeof event.data.height === "number" && event.data.height > 0) {
        setHeight(event.data.height);
      }
    };

    window.addEventListener(
      "message",
      handleMessage,
      { signal },
    );

    return () => {
      abortController.abort();
    };
  }, [id]);

  const searchParams = new URLSearchParams();
  searchParams.set("id", id);
  if (typeof window !== "undefined") {
    searchParams.set("ref_url", window.location.href);
  }
  searchParams.set("colorMode", "system");

  return (
    <div
      className="mt-6 flex max-w-[600px] w-full bluesky-embed"
      data-uri={uri}
    >
      <iframe
        className="w-full block border-none grow"
        style={{ height, overflow: "hidden" }}
        data-bluesky-uri={uri}
        src={`${EMBED_URL}/embed/${uri.slice("at://".length)}?${searchParams.toString()}`}
        title="Bluesky post embed"
        width="100%"
      />
    </div>
  );
}
