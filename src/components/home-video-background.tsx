"use client";

import DitheredVideoFilter from "./video-filter";

export default function HomeVideoBackground() {
  return (
    <DitheredVideoFilter
      videoSrc="https://wh9xsi1isi.ufs.sh/f/3pCuYtORE70iQcTd1tzKQmgchpDLvW6HRVeJosuUikOnjwbf"
      pixelSize={3}
      maxFPS={12}
      maxWidth={1000}
      className="fixed inset-0 w-screen h-screen object-cover -z-10 invert dark:invert-0"
    />
  );
}

export function BlogVideoBackground() {
  return (
    <DitheredVideoFilter
      videoSrc="https://wh9xsi1isi.ufs.sh/f/3pCuYtORE70iFh1vC2kQTmgCPNMpYynkzK4WXJelbq527Zjo"
      pixelSize={4}
      maxFPS={12}
      maxWidth={1000}
      className="fixed inset-0 w-screen h-screen object-cover -z-10 invert dark:invert-0"
    />
  );
}
