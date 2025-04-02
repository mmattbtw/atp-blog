"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GglbRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push(
      "https://drive.google.com/file/d/1hHmM8-W3UGOW59W0yxuTkmVP2iBYiSyD/view?usp=sharing",
    );
  }, [router]);

  return <p>Redirecting...</p>; // Or any loading indicator
}
