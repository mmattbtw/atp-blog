import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://mmatt.net",
  output: "server",
  adapter: cloudflare({
    cloudflareModules: false,
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  redirects: {
    "/blog": "/writing",
    "/weblog": "/writing",
    "/blog/itl_2025": "/post/3lls32ikpkk2s",
    "/weblog/itl_2025": "/post/3lls32ikpkk2s",
    "/blog/gg_usb": "/post/3llrxjxkgws2s",
    "/weblog/gg_usb": "/post/3llrxjxkgws2s",
    "/blog/mastodon": "/post/3lls3oimpf22a",
    "/weblog/mastodon": "/post/3lls3oimpf22a",
    "/blog/atd_v5": "/post/3llrxgworic2s",
    "/weblog/atd_v5": "/post/3llrxgworic2s",
    "/devices": "/uses",
    "/now": "/right/now",
  },
});
