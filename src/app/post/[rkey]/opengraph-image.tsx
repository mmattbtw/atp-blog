import { ImageResponse } from "next/og";

import { getPost } from "#/lib/api";
import { loadGoogleFont } from "#/lib/google-font";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ rkey: string }>;
}) {
  const { rkey } = await params;

  const post = await getPost(rkey);

  const fontData = await loadGoogleFont(
    "VT323",
    "mmatt.net" + (post.value.title?.split(" || ")[0] ?? "Untitled"),
  );

  return new ImageResponse(
    <div
      tw="h-full w-full flex items-center justify-center px-20"
      style={{
        backgroundColor: "#ffffff",
        color: "#000000",
        border: "16px solid #000000",
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
            fontFamily: '\"VT323\"',
            fontSize: 80,
            lineHeight: 1.2,
            letterSpacing: -1,
          }}
        >
          {post.value.title?.split(" || ")[0] ?? "Untitled"}
        </h1>
        <h2
          style={{
            fontFamily: '\"VT323\"',
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
          name: "VT323",
          data: fontData,
        },
      ],
    },
  );
}
