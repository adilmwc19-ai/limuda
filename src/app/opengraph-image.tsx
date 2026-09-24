import { ImageResponse } from "next/og";

export const alt = "לימודא • מרחב לימוד יומי שקט";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadHeeboFont(weight: 400 | 700) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Heebo:wght@${weight}&subset=hebrew`,
    {
      headers: {
        // Google serves woff2 to modern UAs; satori only parses ttf/otf/woff.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
      },
    }
  ).then((res) => res.text());

  const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error("Could not resolve Heebo font URL");

  return fetch(fontUrl).then((res) => res.arrayBuffer());
}

export default async function Image() {
  const [heeboRegular, heeboBold] = await Promise.all([
    loadHeeboFont(400),
    loadHeeboFont(700),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0a09",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "1080px",
            height: "510px",
            border: "1px solid #292524",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Heebo",
              fontWeight: 700,
              fontSize: 128,
              color: "#fafaf9",
              direction: "rtl",
              letterSpacing: "-2px",
            }}
          >
            לימודא
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontFamily: "Heebo",
              fontWeight: 400,
              fontSize: 40,
              color: "#a8a29e",
              direction: "rtl",
            }}
          >
            מרחב לימוד יומי שקט
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Heebo", data: heeboRegular, weight: 400, style: "normal" },
        { name: "Heebo", data: heeboBold, weight: 700, style: "normal" },
      ],
    }
  );
}
