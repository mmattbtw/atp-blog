import { CredentialManager, Client } from "@atcute/client";

import { env } from "./env";

const handler = new CredentialManager({
  service: env.NEXT_PUBLIC_BSKY_PDS,
  fetch,
});
export const bsky = new Client({ handler });
