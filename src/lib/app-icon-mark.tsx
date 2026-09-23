import type { CSSProperties } from "react";

const BRAND_BLUE = "#1e3a8a";

export function AppIconMark({ size }: { size: number }) {
  const outerStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: BRAND_BLUE,
    borderRadius: size * 0.22,
  };

  const cardStyle: CSSProperties = {
    width: size * 0.56,
    height: size * 0.68,
    borderRadius: size * 0.08,
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: size * 0.07,
  };

  const lineStyle = (widthPct: number): CSSProperties => ({
    width: `${widthPct}%`,
    height: size * 0.055,
    borderRadius: size * 0.055,
    background: BRAND_BLUE,
  });

  return (
    <div style={outerStyle}>
      <div style={cardStyle}>
        <div style={lineStyle(62)} />
        <div style={lineStyle(62)} />
        <div style={lineStyle(40)} />
      </div>
    </div>
  );
}
