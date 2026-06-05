import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Group Planner - plan together effortlessly";

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
          padding: 72,
          background: "#f7f4ee",
          color: "#1a1a1a",
          position: "relative",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px)",
            backgroundSize: "100% 34px",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 70,
            top: 60,
            width: 126,
            height: 126,
            border: "5px solid #1a1a1a",
            borderRadius: "32px 42px 36px 28px",
            background: "#fff",
            boxShadow: "12px 12px 0 #1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 46,
            fontWeight: 900,
            color: "#16a34a",
          }}
        >
          GP
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "10px 18px",
              border: "3px solid #16a34a",
              borderRadius: "12px 18px 14px 10px",
              background: "#dcfce7",
              color: "#166534",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            Group Planner
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 86, fontWeight: 900, lineHeight: 0.98, letterSpacing: -4, maxWidth: 820 }}>
            <span>Plan together,</span>
            <span style={{ color: "#16a34a" }}>effortlessly.</span>
          </div>
          <div style={{ fontSize: 32, color: "#555", maxWidth: 780, lineHeight: 1.35 }}>
            Pick dates, share one link, and find the time that works for everyone.
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 18, fontSize: 26, color: "#166534", fontWeight: 800 }}>
            <span>Pick dates</span>
            <span>·</span>
            <span>Collect responses</span>
            <span>·</span>
            <span>Lock the best slot</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
