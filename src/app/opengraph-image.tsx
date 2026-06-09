import { ImageResponse } from "next/og";

// Динамично генерирана OG карта (1200×630). Текстът е латински нарочно —
// default шрифтът на next/og не рендерира кирилица коректно.
export const alt = "Euphoria Hair & Beauty Bar — beauty salon in Varna";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#F8F3EA";
const INK = "#211F26";
const PURPLE = "#5A1FB5";
const MINT = "#A9E0CC";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: CREAM,
          padding: "72px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* мек mint акцент в горния десен ъгъл */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 360,
            height: 360,
            borderRadius: 360,
            backgroundColor: MINT,
            opacity: 0.55,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16, letterSpacing: 6, fontSize: 22, color: "#6B6770" }}>
          BEAUTY SALON · VARNA · BULGARIA
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 700, color: INK, lineHeight: 1 }}>
            Euphoria
          </div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 500, color: PURPLE, marginTop: 8 }}>
            Hair &amp; Beauty Bar
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#4A464F" }}>
            kv. Levski · since 2023 · +359 898 66 33 15
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: INK,
              color: CREAM,
              borderRadius: 999,
              padding: "14px 32px",
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            euphoriabeauty.eu
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
