import satori from "satori";

import { loadGoogleFont } from "./google-font";

export async function renderOgImage({
  requestUrl,
  title,
  subtitle,
  backgroundPath,
  textSize = 80,
}: {
  requestUrl: string;
  title: string;
  subtitle: string;
  backgroundPath: string;
  textSize?: number;
}) {
  const fontData = await loadGoogleFont("Google+Sans+Code", `${title}${subtitle}`);
  const backgroundUrl = new URL(backgroundPath, requestUrl).toString();

  const svg = await satori(
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        color: "#000000",
        border: "16px solid #000000",
        overflow: "hidden",
      }}
    >
      <img
        src={backgroundUrl}
        width="1200"
        height="630"
        style={{
          position: "absolute",
          inset: "0",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 80px",
        }}
      >
        <div
          style={{
            fontFamily: '"Google Sans Code"',
            fontSize: `${textSize}px`,
            lineHeight: 1.2,
            letterSpacing: "-1px",
            textTransform: "lowercase",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: '"Google Sans Code"',
            fontSize: "36px",
            marginTop: "16px",
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Google Sans Code",
          data: fontData,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
    },
  });
}
