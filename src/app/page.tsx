"use client";

import DitheredVideoFilter from "../components/video-filter";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <DitheredVideoFilter
        videoSrc="/test_transparent.mp4"
        pixelSize={3}
        ditherStrength={1}
        useXPattern={false}
        className="fixed inset-0 w-screen h-screen object-cover -z-10 invert dark:invert-0"
      />
      <div className="absolute inset-0 z-10 min-h-screen">
        <div className="max-w-xl pt-1.5 pl-1.5">
          <h1 className="font-bold text-white dark:text-black drop-shadow-lg bg-black dark:bg-white">
            matt
          </h1>
          <p className="text-white dark:text-black drop-shadow-md bg-black dark:bg-white">
            i'm a full time computer science student at{" "}
            <a
              href="https://mtsu.edu"
              className="underline  bg-black dark:bg-white hover:text-black hover:bg-white dark:hover:text-white dark:hover:bg-black"
            >
              MTSU
            </a>
            , part time technologist for{" "}
            <a
              href="https://teal.fm"
              className="underline  bg-black dark:bg-white hover:text-black hover:bg-white dark:hover:text-white dark:hover:bg-black"
            >
              teal.fm
            </a>
            , and a resident at{" "}
            <a
              href="https://opn.haus"
              className="underline  bg-black dark:bg-white hover:text-black hover:bg-white dark:hover:text-white dark:hover:bg-black"
            >
              Open House*
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
