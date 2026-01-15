import { BlogVideoBackground } from "#/components/home-video-background";
import { PostList } from "#/components/post-list";

// Revalidate every hour (3600 seconds)
export const revalidate = 3600;

export default function WritingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <BlogVideoBackground />
      <div className="absolute inset-0 z-10 min-h-screen">
        <div className="max-w-148 pt-1.5 pl-1.5 space-y-4">
          <h1 className="font-bold text-black dark:text-white  bg-white dark:bg-black inline">
            (;;;*_*) writing
          </h1>
          <PostList />
        </div>
      </div>
    </main>
  );
}
