"use server";

import twilio from "twilio";

import { env } from "#/lib/env";

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export async function callMeAction(input: string) {
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
