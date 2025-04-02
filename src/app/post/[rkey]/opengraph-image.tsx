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
    "Inter:wght@100..900",
    "mmatt.net" + post.value.title,
  );

  return new ImageResponse(
    (
      <div tw="h-full w-full bg-white flex flex-col justify-center items-center px-20">
        <h1
          style={{
            fontFamily: '"Inter"',
            fontSize: 80,
            fontWeight: 900,
            textAlign: "center",
            fontOpticalSizing: "auto",
            fontStyle: "normal",
          }}
        >
          {post.value.title}
        </h1>
        <h1
          style={{
            fontSize: 32,
            fontFamily: '"Inter"',
          }}
        >
          mmatt.net
        </h1>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Inter",
          data: fontData,
        },
      ],
    },
  );
}
