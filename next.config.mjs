import { withPlausibleProxy } from "next-plausible";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [75, 90, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "evil.gay",
        pathname: "/xrpc/com.atproto.sync.getBlob",
        // search: '?did=did%3Aplc%3Ap2cp5gopk7mgjegy6wadk3ep&cid=**',
      },
      {
        protocol: "https",
        hostname: "pds.mmatt.net",
        pathname: "/xrpc/com.atproto.sync.getBlob",
      },
      {
        protocol: "https",
        hostname: "evil.gay",
        pathname: "/xrpc/com.atproto.sync.getBlob",
        // search: '?did=did%3Aplc%3Ap2cp5gopk7mgjegy6wadk3ep&cid=**',
      },
      {
        protocol: "https",
        hostname: "cdn.some.pics",
        pathname: "/(mm|matt)/*",
      },
      {
        protocol: "https",
        hostname: "cdn.bsky.app",
        pathname: "/img/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/(weblog|blog)/itl_2025",
        destination: "/post/3lls32ikpkk2s",
      },
      {
        source: "/(weblog|blog)/gg_usb",
        destination: "/post/3llrxjxkgws2s",
      },
      {
        source: "/(weblog|blog)/mastodon",
        destination: "/post/3lls3oimpf22a",
      },
      {
        source: "/(weblog|blog)/atd_v5",
        destination: "/post/3llrxgworic2s",
      },
      {
        source: "/devices",
        destination: "/uses",
      },
      {
        source: "/now",
        destination: "/right/now",
      },
    ];
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/.well-known/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ];
  },
};

export default withPlausibleProxy({
  customDomain: "https://plausible.mmatt.net",
})(nextConfig);
