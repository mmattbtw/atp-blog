import { ImageResponse } from "next/og";

import { loadGoogleFont } from "#/lib/google-font";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const fontData = await loadGoogleFont("Inter:wght@100..900", "mmatt.net");

  return new ImageResponse(
    (
      <div tw="h-full w-full bg-white flex flex-col justify-center items-center">
        <h1
          style={{
            fontFamily: '"Inter"',
            fontSize: 80,
            fontWeight: 1000,
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
