import Link from "next/link";

import { PostList } from "#/components/post-list";
import { Paragraph, Title } from "#/components/typography";

export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-dvh p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-[600px]">
        <div className="self-center flex flex-col">
          <Title level="h1" className="m-0">
            mmatt.net
          </Title>
        </div>
        <Title level="h2">Hello!</Title>
        <Paragraph>
          my name is <b>matt morris</b> and i&apos;m head technologist for{" "}
          <a href="https://songish.app?via=mmatt.net" className="underline">
            Songish
          </a>
          , part time maintainer for{" "}
          <a href="https://teal.fm?via=mmatt.net" className="underline">
            teal.fm
          </a>
          , resident at{" "}
          <a href="https://opn.haus?via=mmatt.net" className="underline">
            Open House*
          </a>
          , and student at{" "}
          <a href="https://mtsu.edu?via=mmatt.net" className="underline">
            MTSU
          </a>{" "}
          🧑‍🔬
        </Paragraph>
        <Paragraph>
          welcome to my new Work-In-Progress website! powered by{" "}
          <a href="https://whtwnd.com?via=mmatt.net" className="underline">
            WhiteWind
          </a>{" "}
          &{" "}
          <a href="https://atproto.com?via=mmatt.net" className="underline">
            ATProto
          </a>
          . this is a fork from the wonderful{" "}
          <a
            className="underline"
            href="https://bsky.app/profile/did:plc:p2cp5gopk7mgjegy6wadk3ep"
          >
            @samuel.bsky.team
          </a>{" "}
          (originally{" "}
          <a
            href="https://github.com/mozzius/mozzius.dev"
            className="underline"
          >
            here
          </a>
          , my repo{" "}
          <a href="https://github.com/mmattbtw/atp-blog" className="underline">
            here
          </a>
          ) that I am going to continue to iterate on. hoping to add blog post
          comments & reactions!
        </Paragraph>
        <Paragraph>my past projects include...</Paragraph>
        <ul className="list-disc -mt-5">
          <li>
            <a
              className="underline"
              href="https://github.com/mmattDonk/AI-TTS-Donations"
            >
              the <b>first</b> free and open source AI Text to Speech program
              for Twitch Streamers.
            </a>
          </li>
          <li>
            <a
              className="underline"
              href="https://github.com/mmattDonk/TwitchTunes"
            >
              the (at the time) best way for Spotify users to recieve Song
              Requests on Twitch.
            </a>
          </li>
          <li>
            <a
              className="underline"
              href="https://github.com/mmattbtw/Super-VCs"
            >
              the <b>best</b> automatic voice channel bot on Discord.
            </a>
          </li>
          <a className="underline" href="https://github.com/mmattbtw">
            and more...
          </a>
        </ul>

        <Paragraph>you can find me all over the web at:</Paragraph>

        <ul className="list-disc -mt-5">
          <li>
            <a
              className="underline"
              href="https://bsky.app/profile/did:plc:tas6hj2xjrqben5653v5kohk"
              rel="me"
            >
              bluesky
            </a>
          </li>
          <li>
            <a
              className="underline"
              href="https://youtube.com/@mmattbtw"
              rel="me"
            >
              youtube
            </a>
          </li>
          <li>
            <a
              className="underline"
              href="https://github.com/mmattbtw"
              rel="me"
            >
              github
            </a>
          </li>
          <li>
            <a className="underline" href="https://twitch.tv/mmattbtw" rel="me">
              twitch
            </a>
          </li>
          <li>
            <a className="underline" href="https://social.lol/@matt" rel="me">
              mastodon
            </a>
          </li>
          <li>
            <a
              className="underline"
              href="https://music.apple.com/profile/air2earth"
              rel="me"
            >
              apple music
            </a>
          </li>
          <li>
            <a className="underline" href="https://matt.omg.lol">
              everywhere else...
            </a>
          </li>
        </ul>

        <Paragraph>
          my email is{" "}
          <a className="underline" href="mailto:matt@mmatt.net" rel="me">
            matt at mmatt.net
          </a>
        </Paragraph>

        <Title id="blog" level="h2">
          Blog Posts:
        </Title>
        <Link className="-mt-6 underline" href="/rss">
          Subscribe via RSS
        </Link>
        <div className="flex flex-col gap-4 w-full">
          <PostList />
        </div>
      </main>
    </div>
  );
}
