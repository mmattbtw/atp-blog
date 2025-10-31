import { ImageResponse } from "next/og";

import { loadGoogleFont } from "#/lib/google-font";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const fontData = await loadGoogleFont("VT323", "mmatt.net");

  return new ImageResponse(
    (
      <div
        tw="h-full w-full flex items-center justify-center"
        style={{
          backgroundColor: "#ffffff",
          color: "#000000",
          border: "16px solid #000000",
        }}
      >
        <div
          tw="flex items-center justify-center"
          style={{ width: "100%", height: "100%" }}
        >
          <h1
            style={{
              fontFamily: '"VT323"',
              fontSize: 96,
              lineHeight: 1.2,
              letterSpacing: -1,
              textTransform: "lowercase",
            }}
          >
            mmatt.net
          </h1>
        </div>
      </div>
    ),
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
