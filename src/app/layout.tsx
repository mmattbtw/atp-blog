import type { Metadata, Viewport } from "next";
import NextPlausible from "next-plausible";
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
          sans.variable,

          "antialiased font-sans",
        )}
      >
        {children}
      </body>
    </html>
  );
}
