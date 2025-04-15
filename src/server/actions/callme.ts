"use server";

import { headers } from "next/headers";
import twilio from "twilio";

import { env } from "#/lib/env";
import { ratelimit } from "#/lib/rate-limit";

export async function callMeAction(input: string) {
  // Get IP from headers (works in Next.js App Router)
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0] || "unknown";

  // Rate limit check
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    console.error("RATE LIMIT EXCEEDED");
    return { success: false };
  }

  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(input);

  try {
    const call = await client.calls.create({
      twiml: twiml.toString(),
      to: env.MY_PHONE_NUMBER,
      from: env.TWILIO_PHONE_NUMBER,
    });
    console.log("Call initiated:", call);
    return { success: true };
  } catch (error) {
    console.error("Error initiating call:", error);
    return { success: false };
  }
}
