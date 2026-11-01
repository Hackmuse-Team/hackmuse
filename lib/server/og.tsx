import "server-only";

// Helpers for share images (next/og). Satori lays out with flexbox only, takes inline styles, and
// reads TTF/OTF but not WOFF2, which is why fonts are fetched in the format Google serves to
// non-browser clients.

const fonts = new Map<string, Promise<ArrayBuffer | null>>();

/** A Google Font as raw TTF, fetched once per process. Null when offline: the image then uses the default font. */
export function googleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  const key = `${family}:${weight}`;
  let font = fonts.get(key);
  if (!font) {
    font = (async () => {
      try {
        const css = await (
          await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`)
        ).text();
        const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
        if (!url) throw new Error("no TTF in the font CSS");
        return await (await fetch(url)).arrayBuffer();
      } catch {
        fonts.delete(key); // try again next time instead of caching the failure
        return null;
      }
    })();
    fonts.set(key, font);
  }
  return font;
}

export async function ogFonts() {
  const [display, mono] = await Promise.all([googleFont("Barlow Condensed", 900), googleFont("Space Mono", 700)]);
  return [
    ...(display ? [{ name: "Display", data: display, weight: 900 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Mono", data: mono, weight: 700 as const, style: "normal" as const }] : []),
  ];
}

export const OG = {
  cream: "#f1ecdf",
  paper: "#faf7ef",
  ink: "#10201c",
  teal: "#3d5e56",
  tealDeep: "#1d3631",
  blood: "#7b1a14",
  coral: "#e8736a",
  coralDeep: "#c9544b",
  mustard: "#e9b949",
};

export function OgFin({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={(size * 30) / 40} viewBox="0 0 40 30">
      <path
        d="M2 29 C 12 24 19 12 31 2 C 30 13 33 22 38 29 Z"
        fill={color}
        stroke={OG.ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The teal top bar every share card starts with. */
export function OgBar({ right }: { right: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: OG.teal,
        color: OG.cream,
        borderBottom: `6px solid ${OG.ink}`,
        padding: "18px 44px",
        fontFamily: "Mono",
        fontSize: 22,
        letterSpacing: 4,
        textTransform: "uppercase",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            display: "flex",
            width: 38,
            height: 38,
            alignItems: "center",
            justifyContent: "center",
            background: OG.mustard,
            border: `3px solid ${OG.ink}`,
            color: OG.ink,
            fontFamily: "Display",
            fontSize: 26,
          }}
        >
          H
        </div>
        HACKMUSE
      </div>
      <div style={{ display: "flex" }}>{right}</div>
    </div>
  );
}
