import { ImageResponse } from "next/og";

import { getPost, type BlogPost } from "#/lib/api";
import { loadGoogleFont } from "#/lib/google-font";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Helper to get title from either post type
function getPostTitle(post: BlogPost): string {
  if (post.type === "whitewind") {
    return post.value.title?.split(" || ")[0] ?? "Untitled";
  }
  return post.value.title;
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ rkey: string }>;
}) {
  const { rkey } = await params;

  const post = await getPost(rkey);
  const title = getPostTitle(post);

  const fontData = await loadGoogleFont(
    "Google+Sans+Code",
    "mmatt.net" + title,
  );

  return new ImageResponse(
    <div
      tw="h-full w-full flex items-center justify-center px-20"
      style={{
        backgroundColor: "#ffffff",
        color: "#000000",
        border: "16px solid #000000",
        backgroundImage: "url(https://mmatt.net/blogbg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        tw="flex flex-col items-center justify-center"
        style={{
          width: "100%",
          height: "100%",
          textAlign: "center",
          fontOpticalSizing: "auto",
          fontStyle: "normal",
        }}
      >
        <h1
          style={{
            fontFamily: '"Google Sans Code"',
            fontSize: 80,
            lineHeight: 1.2,
            letterSpacing: -1,
          }}
        >
          {title}
        </h1>
        <h2
          style={{
            fontFamily: '"Google Sans Code"',
            fontSize: 36,
            marginTop: 16,
          }}
        >
          mmatt.net
        </h2>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Google Sans Code",
          data: fontData,
        },
      ],
    },
  );
}
