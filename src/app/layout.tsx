import type { Metadata, Viewport } from "next";
import NextPlausible from "next-plausible";
import { VT323, Jersey_10 } from "next/font/google";

import { cx } from "#/lib/cx";

import "./globals.css";

const heading = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

const body = Jersey_10({
  variable: "--font-jersey",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mmatt.net"),
  title: "mmatt.net",
  description: "<_< ^_^ >_>",
  alternates: {
    canonical: "https://mmatt.net",
    types: {
      "application/rss+xml": "https://mmatt.net/rss",
    },
  },
  other: {
    "fediverse:creator": "@matt@social.lol",
  },
};

export const viewport: Viewport = {
  themeColor: {
    color: "#BEFCFF",
    media: "not screen",
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
        <NextPlausible
          domain="mmatt.net"
          customDomain="https://plausible.mmatt.net"
          trackOutboundLinks
          selfHosted
        />
      </head>
      <body
        className={cx(
          heading.variable,
          body.variable,

          "antialiased font-sans",
        )}
      >
        {children}
      </body>
    </html>
  );
}
