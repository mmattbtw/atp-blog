import InfoBox from "#/components/info-box";
import Link from "#/components/ui/link";

import HomeVideoBackground from "../components/home-video-background";

// Revalidate every hour (3600 seconds)
export const revalidate = 3600;

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <HomeVideoBackground />
      <div className="absolute inset-0 z-10 min-h-screen">
        <div className="max-w-148 pt-1.5 pl-1.5 space-y-4">
          <h1 className="font-bold text-black dark:text-white bg-white dark:bg-black">
            ˙⋆✮ matt ✮⋆˙
          </h1>
          <p className="text-black dark:text-white bg-white dark:bg-black">
            (ﾉ´ヮ`)ﾉ*: ･ﾟ i&apos;m a full time computer science student at{" "}
            <Link href="https://mtsu.edu">MTSU</Link>, part time technologist
            for <Link href="https://teal.fm">teal.fm</Link>, and a resident at{" "}
            <Link href="https://opn.haus">Open House*</Link>.
          </p>
          <p>
            <Link href="https://matt.omg.lol">
              &gt;&gt; all over the web &lt;&lt;
            </Link>
            {" <_< ^_^ >_>  "}
            <Link href="mailto:matt@mmatt.net">&gt;&gt; mail me &lt;&lt;</Link>
          </p>
          <p>
            <Link href="/writing">(;;;*_*) writing</Link>
          </p>
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

        {/* InfoBox positioned for desktop and mobile */}
        <div className="fixed top-4 right-4 z-20 md:block hidden">
          <InfoBox />
        </div>

        {/* Mobile InfoBox - positioned below main content */}
        <div className="md:hidden pt-8 px-1.5">
          <InfoBox />
        </div>
      </div>
    </main>
  );
}
