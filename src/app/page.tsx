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
        <div className="max-w-xl pt-1.5 pl-1.5 space-y-4">
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
