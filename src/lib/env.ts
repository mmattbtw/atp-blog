import { cleanEnv, str, url } from "envalid";

// Define environment variables explicitly for Next.js static compilation
const envVars = {
  NODE_ENV: process.env.NODE_ENV,
  PLAUSIBLE_SITE_ID: process.env.PLAUSIBLE_SITE_ID,
  PLAUSIBLE_DOMAIN: process.env.PLAUSIBLE_DOMAIN,
  PLAUSIBLE_API_KEY: process.env.PLAUSIBLE_API_KEY,
  NEXT_PUBLIC_BSKY_DID: process.env.NEXT_PUBLIC_BSKY_DID,
  NEXT_PUBLIC_BSKY_PDS: process.env.NEXT_PUBLIC_BSKY_PDS,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  MY_PHONE_NUMBER: process.env.MY_PHONE_NUMBER,
};

// Use cleanEnv to validate and parse the environment variables
export const env = cleanEnv(envVars, {
  NODE_ENV: str({
    choices: ["development", "production"],
    default: "production",
    devDefault: "development",
  }),
  PLAUSIBLE_SITE_ID: str({ default: "mmatt.net" }),
  PLAUSIBLE_DOMAIN: url({ default: "https://plausible.mmatt.net" }),
  PLAUSIBLE_API_KEY: str({ default: "" }),
  NEXT_PUBLIC_BSKY_DID: str({ default: "did:plc:tas6hj2xjrqben5653v5kohk" }),
  NEXT_PUBLIC_BSKY_PDS: url({
    default: "https://pds.mmatt.net",
  }),
  TWILIO_ACCOUNT_SID: str({ default: "" }),
  TWILIO_AUTH_TOKEN: str({ default: "" }),
  TWILIO_PHONE_NUMBER: str({ default: "" }),
  MY_PHONE_NUMBER: str({ default: "" }),
});
