import HomeVideoBackground from "../components/home-video-background";

// Revalidate every hour (3600 seconds)
export const revalidate = 3600;

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <HomeVideoBackground />
      <div className="absolute inset-0 z-10 min-h-screen">
        <div className="max-w-xl pt-1.5 pl-1.5 space-y-4">
          <h1 className="font-bold text-black dark:text-white drop-shadow-lg bg-white dark:bg-black">
            ˙⋆✮ matt ✮⋆˙
          </h1>
          <p className="text-black dark:text-white drop-shadow-md bg-white dark:bg-black">
            (ﾉ´ヮ`)ﾉ*: ･ﾟ i'm a full time computer science student at{" "}
            <a
              href="https://mtsu.edu"
              className="underline  bg-white dark:bg-black hover:text-white hover:bg-black dark:hover:text-black dark:hover:bg-white"
            >
              MTSU
            </a>
            , part time technologist for{" "}
            <a
              href="https://teal.fm"
              className="underline  bg-white dark:bg-black hover:text-white hover:bg-black dark:hover:text-black dark:hover:bg-white"
            >
              teal.fm
            </a>
            , and a resident at{" "}
            <a
              href="https://opn.haus"
              className="underline  bg-white dark:bg-black hover:text-white hover:bg-black dark:hover:text-black dark:hover:bg-white"
            >
              Open House*
            </a>
            .
          </p>
          <p>
            <a
              href="https://matt.omg.lol"
              className="underline bg-white dark:bg-black hover:text-white hover:bg-black dark:hover:text-black dark:hover:bg-white"
            >
              &gt;&gt; all over the web &lt;&lt;
            </a>
            {" <_< ^_^ >_>  "}
            <a
              href="mailto:matt@mmatt.net"
              className="underline bg-white dark:bg-black hover:text-white hover:bg-black dark:hover:text-black dark:hover:bg-white"
            >
              &gt;&gt; mail me &lt;&lt;
            </a>
          </p>
          <p>
            <a
              href="/writing"
              className="underline bg-white dark:bg-black hover:text-white hover:bg-black dark:hover:text-black dark:hover:bg-white"
            >
              (;;;*_*) writing
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
