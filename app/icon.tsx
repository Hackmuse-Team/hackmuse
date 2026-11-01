import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// The tab icon: a coral fin on the mustard brand square.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "flex-end",
          justifyContent: "center",
          background: "#e9b949",
          border: "5px solid #10201c",
        }}
      >
        <svg width="50" height="40" viewBox="0 0 40 30">
          <path
            d="M2 29 C 12 24 19 12 31 2 C 30 13 33 22 38 29 Z"
            fill="#e8736a"
            stroke="#10201c"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
