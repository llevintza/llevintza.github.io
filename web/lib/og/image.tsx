import fs from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/site/metadata";

import { SITE_HOST, type OgCard } from "./card-input";
import { OG_SIZE } from "./constants";

/*
 * Social preview images (#30), rendered by `next/og` (Satori + resvg) when the
 * site builds. A page gets its image in two steps:
 *
 * 1. A route handler next to the page, `<page>/og.png/route.tsx`:
 *
 *      import { pageCard, renderOgImage } from "@/lib/og";
 *      export const dynamic = "force-static";
 *      export function GET() {
 *        return renderOgImage(pageCard({ title, subtitle, path: "/about/" }));
 *      }
 *
 *    Dynamic segments add `generateStaticParams` and read `params` (see the
 *    post route's og.png/route.tsx).
 * 2. `buildMetadata({ ..., image: { path: ogImagePath("/about/"), alt } })`.
 *    Pages that skip both get the site-wide default image (`/og.png`).
 *
 * Colours are the dark console theme (app/globals.css). Satori can't read
 * woff2 or variable fonts, so lib/og/fonts holds static TTF/OTF instances made
 * from the same subsets in app/fonts (see lib/og/fonts/README.md). They are
 * read from disk here: nothing is fetched over the network.
 */

/** Dark-theme tokens from app/globals.css. */
export const OG_COLORS = {
  bg: "#0b1118",
  ink: "#d5dee7",
  muted: "#8796a5",
  accent: "#3498db",
  line: "#22313f",
  navy: "#2c3e50",
} as const;

const FONT_DIR = path.join(process.cwd(), "lib", "og", "fonts");

type Font = NonNullable<
  ConstructorParameters<typeof ImageResponse>[1]
>["fonts"] extends (infer F)[] | undefined
  ? F
  : never;

let fontCache: Font[] | undefined;

/** JetBrains Mono 400/700 and Departure Mono, read once per build worker. */
export function loadOgFonts(fontDir: string = FONT_DIR): Font[] {
  if (fontCache && fontDir === FONT_DIR) return fontCache;
  const read = (file: string) => fs.readFileSync(path.join(fontDir, file));
  const fonts: Font[] = [
    {
      name: "JetBrains Mono",
      data: read("JetBrainsMono-400.ttf"),
      weight: 400,
      style: "normal",
    },
    {
      name: "JetBrains Mono",
      data: read("JetBrainsMono-700.ttf"),
      weight: 700,
      style: "normal",
    },
    {
      name: "Departure Mono",
      data: read("DepartureMono-Regular.otf"),
      weight: 400,
      style: "normal",
    },
  ];
  if (fontDir === FONT_DIR) fontCache = fonts;
  return fonts;
}

/** The card markup. Satori needs `display: flex` on every multi-child box. */
export function OgCardView({ card }: { card: OgCard }) {
  const c = OG_COLORS;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: c.bg,
        // Gradient mesh, then the faint 32px console grid.
        backgroundImage: [
          `radial-gradient(circle at 88% 8%, rgba(52,152,219,0.30), rgba(52,152,219,0) 45%)`,
          `radial-gradient(circle at 8% 100%, rgba(44,62,80,0.85), rgba(44,62,80,0) 55%)`,
          `linear-gradient(${c.line} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${c.line} 1px, transparent 1px)`,
        ].join(", "),
        backgroundSize: "100% 100%, 100% 100%, 32px 32px, 32px 32px",
        color: c.ink,
        fontFamily: "JetBrains Mono",
        padding: 48,
      }}
    >
      {/* Terminal window. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          border: `2px solid ${c.line}`,
          borderRadius: 16,
          backgroundColor: "rgba(11,17,24,0.82)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 28px",
            borderBottom: `2px solid ${c.line}`,
            fontFamily: "Departure Mono",
            fontSize: 26,
            color: c.muted,
          }}
        >
          <div style={{ display: "flex", gap: 10, marginRight: 12 }}>
            {[c.line, c.navy, c.accent].map((color) => (
              <div
                key={color}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: color,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", overflow: "hidden" }}>
            <span style={{ color: c.accent }}>{SITE_HOST}</span>
            <span>:{card.prompt}</span>
            <span style={{ color: c.ink, marginLeft: 14 }}>$</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flexGrow: 1,
            padding: "0 56px",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: card.titleSize,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: -1,
              color: c.ink,
            }}
          >
            {card.title}
          </div>
          {card.subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                lineHeight: 1.4,
                color: c.muted,
              }}
            >
              {card.subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 56px 28px",
            fontSize: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: c.accent, fontFamily: "Departure Mono" }}>
              {">"}
            </span>
            <span style={{ fontWeight: 700 }}>{SITE_NAME}</span>
          </div>
          <div
            style={{
              display: "flex",
              width: 18,
              height: 32,
              backgroundColor: c.accent,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Renders a card to a 1200x630 PNG response. */
export function renderOgImage(card: OgCard): ImageResponse {
  return new ImageResponse(<OgCardView card={card} />, {
    ...OG_SIZE,
    fonts: loadOgFonts(),
  });
}
