import type { APIRoute } from "astro";

export const GET: APIRoute = async () =>
  new Response("did:plc:tas6hj2xjrqben5653v5kohk", {
    headers: {
      "Content-Type": "text/plain",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
      "Access-Control-Allow-Headers":
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
    },
  });
