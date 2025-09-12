export const dynamic = "force-static";
export const revalidate = 3600; // 1 hour

export default function Home() {
  return (
    <main>
      <div className="max-w-xl pt-1.5 pl-1.5">
        <h1 className="font-bold">matt</h1>
        <p>
          i'm a full time computer science student at{" "}
          <a href="https://mtsu.edu" className="underline">
            MTSU
          </a>
          , part time technologist for{" "}
          <a href="https://teal.fm" className="underline">
            teal.fm
          </a>
          , and a resident at{" "}
          <a href="https://opn.haus" className="underline">
            Open House*
          </a>
          .
        </p>
      </div>
    </main>
  );
}
