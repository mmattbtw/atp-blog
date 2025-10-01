"use client";

import DitheredVideoFilter from "./video-filter";

export default function HomeVideoBackground() {
  return (
    <DitheredVideoFilter
      videoSrc="/test_transparent.webm"
      pixelSize={3}
      maxWidth={1000}
      className="fixed inset-0 w-screen h-screen object-cover -z-10 invert dark:invert-0"
    />
  );
}
