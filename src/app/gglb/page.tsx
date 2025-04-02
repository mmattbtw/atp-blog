"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GglbRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push(
      "https://docs.google.com/spreadsheets/d/1yuRxzvOG0_wNut_5KY0fIoef2nQwYWUQBVmO8jQ_iTo/edit?usp=sharing",
    );
  }, [router]);

  return <p>Redirecting...</p>; // Or any loading indicator
}
