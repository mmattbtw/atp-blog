import { withPlausibleProxy } from "next-plausible";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pds.mmatt.net",
        pathname: "/xrpc/com.atproto.sync.getBlob",
        // search: '?did=did%3Aplc%3Ap2cp5gopk7mgjegy6wadk3ep&cid=**',
      },
      {
        protocol: "https",
        hostname: "cdn.some.pics",
        pathname: "/mm/*",
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
    ];
  },
};

export default withPlausibleProxy({
  customDomain: "https://plausible.mmatt.net",
})(nextConfig);
