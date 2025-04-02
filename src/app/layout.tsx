import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { cx } from "#/lib/cx";

import "./globals.css";

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mmatt.net"),
  title: "mmatt.net",
  description: "a webbed site",
  alternates: {
    canonical: "https://mmatt.net",
    types: {
      "application/rss+xml": "https://mmatt.net/rss",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* TODO: */}
        {/* <NextPlausible
          domain="mozzius.dev"
          customDomain="https://plausible.mozzius.dev"
          trackOutboundLinks
          selfHosted
        /> */}
      </head>
      <body
        className={cx(
          sans.variable,

          "antialiased font-sans",
        )}
      >
        {children}
      </body>
    </html>
  );
}
