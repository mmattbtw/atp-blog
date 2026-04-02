import type { APIRoute } from "astro";

export const GET: APIRoute = async () =>
  Response.json(
    {
      subject: "acct:matt@social.lol",
      aliases: ["https://social.lol/@matt", "https://social.lol/users/matt"],
      links: [
        {
          rel: "http://webfinger.net/rel/profile-page",
          type: "text/html",
          href: "https://social.lol/@matt",
        },
        {
          rel: "self",
          type: "application/activity+json",
          href: "https://social.lol/users/matt",
        },
        {
          rel: "http://ostatus.org/schema/1.0/subscribe",
          template: "https://social.lol/authorize_interaction?uri={uri}",
        },
      ],
    },
    {
      headers: {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
        "Access-Control-Allow-Headers":
          "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
      },
    },
  );
