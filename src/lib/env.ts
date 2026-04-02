import { cleanEnv, str, url } from "envalid";

type EnvSource = Record<string, string | undefined>;

export interface AppEnv {
  NODE_ENV: "development" | "production";
  PLAUSIBLE_SITE_ID: string;
  PLAUSIBLE_DOMAIN: string;
  PLAUSIBLE_API_KEY: string;
  PUBLIC_BSKY_DID: string;
  BSKY_PDS_URL: string;
  PUBLIC_SITE_URL: string;
  PURGE_PASSWORD: string;
}

function getCandidate(
  key: string,
  runtimeEnv?: EnvSource,
): string | undefined {
  return (
    runtimeEnv?.[key] ??
    runtimeEnv?.[`NEXT_PUBLIC_${key}`] ??
    (import.meta.env[key as keyof ImportMetaEnv] as string | undefined) ??
    (import.meta.env[`PUBLIC_${key}` as keyof ImportMetaEnv] as
      | string
      | undefined) ??
    process.env[key] ??
    process.env[`NEXT_PUBLIC_${key}`]
  );
}

export function readEnv(runtimeEnv?: EnvSource): AppEnv {
  const envVars = {
    NODE_ENV:
      getCandidate("NODE_ENV", runtimeEnv) ?? process.env.NODE_ENV ?? "production",
    PLAUSIBLE_SITE_ID: getCandidate("PLAUSIBLE_SITE_ID", runtimeEnv),
    PLAUSIBLE_DOMAIN: getCandidate("PLAUSIBLE_DOMAIN", runtimeEnv),
    PLAUSIBLE_API_KEY: getCandidate("PLAUSIBLE_API_KEY", runtimeEnv),
    PUBLIC_BSKY_DID:
      getCandidate("PUBLIC_BSKY_DID", runtimeEnv) ??
      getCandidate("BSKY_DID", runtimeEnv),
    BSKY_PDS_URL:
      getCandidate("BSKY_PDS_URL", runtimeEnv) ??
      getCandidate("PUBLIC_BSKY_PDS", runtimeEnv),
    PUBLIC_SITE_URL:
      getCandidate("PUBLIC_SITE_URL", runtimeEnv) ??
      getCandidate("SITE_URL", runtimeEnv) ??
      getCandidate("NEXT_PUBLIC_BASE_URL", runtimeEnv),
    PURGE_PASSWORD: getCandidate("PURGE_PASSWORD", runtimeEnv),
  };

  const parsed = cleanEnv(envVars, {
    NODE_ENV: str({
      choices: ["development", "production"],
      default: "production",
      devDefault: "development",
    }),
    PLAUSIBLE_SITE_ID: str({ default: "mmatt.net" }),
    PLAUSIBLE_DOMAIN: url({ default: "https://plausible.mmatt.net" }),
    PLAUSIBLE_API_KEY: str({ default: "" }),
    PUBLIC_BSKY_DID: str({
      default: "did:plc:tas6hj2xjrqben5653v5kohk",
    }),
    BSKY_PDS_URL: url({
      default: "https://evil.gay",
    }),
    PUBLIC_SITE_URL: url({
      default: "https://mmatt.net",
    }),
    PURGE_PASSWORD: str({ default: "" }),
  });

  return {
    NODE_ENV: parsed.NODE_ENV,
    PLAUSIBLE_SITE_ID: parsed.PLAUSIBLE_SITE_ID,
    PLAUSIBLE_DOMAIN: parsed.PLAUSIBLE_DOMAIN,
    PLAUSIBLE_API_KEY: parsed.PLAUSIBLE_API_KEY,
    PUBLIC_BSKY_DID: parsed.PUBLIC_BSKY_DID,
    BSKY_PDS_URL: parsed.BSKY_PDS_URL,
    PUBLIC_SITE_URL: parsed.PUBLIC_SITE_URL,
    PURGE_PASSWORD: parsed.PURGE_PASSWORD,
  };
}

export const env = readEnv();

export function readEnvFromLocals(
  locals?: {
    runtime?: {
      env?: EnvSource;
    };
  } | null,
): AppEnv {
  return readEnv(locals?.runtime?.env);
}
