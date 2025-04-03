"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GglbRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push("/#blog");
  }, [router]);

  return <p>Redirecting...</p>; // Or any loading indicator
}
