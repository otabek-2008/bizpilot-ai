import { ImageResponse } from "next/og";

// Telegram, Facebook va boshqalarda havola ulashilganda chiqadigan rasm
export const alt = "CampusAI — talabalar uchun aqlli AI vositalar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "radial-gradient(circle at 80% 20%, #4c1d95 0%, #07070b 60%)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 30,
              background: "linear-gradient(135deg, #a78bfa, #7c3aed 55%, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="68" height="68" viewBox="8 12 48 40" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M52 27 32 18 12 27l20 9 20-9Z" />
              <path d="M20 31v10c0 3 5.4 6 12 6s12-3 12-6V31" />
              <path d="M52 27v11" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
            Campus<span style={{ color: "#a78bfa" }}>AI</span>
          </div>
        </div>
        <div style={{ marginTop: 44, fontSize: 44, color: "#e4e4e7", lineHeight: 1.3 }}>
          Talabalar uchun aqlli AI vositalar — o&apos;zbek tilida
        </div>
        <div style={{ marginTop: 20, fontSize: 30, color: "#a1a1aa" }}>
          AI yordamchi · Referat · Lotin ↔ Kirill · 3×4 rasm · PDF ↔ Word
        </div>
      </div>
    ),
    size,
  );
}
