/**
 * Mock-only product artwork: small SVG illustrations served as data URIs so the
 * demo store and Digital Gold screens have real-looking imagery without network access.
 */

export type DemoArtKind =
  | "ring"
  | "necklace"
  | "bangle"
  | "earrings"
  | "pendant"
  | "chain"
  | "coin"
  | "bar"
  | "silver-coin"
  | "banner-festive"
  | "banner-bridal"
  | "banner-coins"
  | "category";

const GOLD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c4"/><stop offset=".35" stop-color="#e6c06a"/><stop offset=".7" stop-color="#b8862f"/><stop offset="1" stop-color="#f3d58a"/></linearGradient>`;
const SILVER = `<linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#d7dbe0"/><stop offset=".75" stop-color="#9aa1aa"/><stop offset="1" stop-color="#eef0f3"/></linearGradient>`;

function bg(tone: string) {
  return `<radialGradient id="bg" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="${tone}"/><stop offset="1" stop-color="#ead9c4"/></radialGradient><rect width="400" height="400" fill="url(#bg)"/><ellipse cx="200" cy="335" rx="120" ry="14" fill="#7a5a33" opacity=".12"/>`;
}

const ART: Record<string, (tone: string) => string> = {
  ring: (t) =>
    `${bg(t)}<ellipse cx="200" cy="225" rx="88" ry="92" fill="none" stroke="url(#g)" stroke-width="22"/><ellipse cx="200" cy="225" rx="88" ry="92" fill="none" stroke="#fff6d8" stroke-width="3" opacity=".6"/><path d="M168 132 l32-34 l32 34 l-32 30z" fill="#f7fbff" stroke="#c9d6e6" stroke-width="3"/><path d="M168 132 l32 30 l32-30" fill="none" stroke="#b6c7dc" stroke-width="2"/><circle cx="188" cy="118" r="4" fill="#fff"/>`,
  necklace: (t) =>
    `${bg(t)}<path d="M92 92 C110 230 290 230 308 92" fill="none" stroke="url(#g)" stroke-width="9" stroke-dasharray="2 9" stroke-linecap="round"/><path d="M110 100 C130 250 270 250 290 100" fill="none" stroke="url(#g)" stroke-width="6"/><circle cx="200" cy="262" r="30" fill="url(#g)"/><circle cx="200" cy="262" r="15" fill="#8e1a36"/><circle cx="194" cy="256" r="4" fill="#fff" opacity=".8"/>${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${132 + i * 27}" cy="${210 + Math.abs(2.5 - i) * -12 + 18}" r="7" fill="url(#g)"/>`).join("")}`,
  bangle: (t) =>
    `${bg(t)}<ellipse cx="200" cy="205" rx="118" ry="110" fill="none" stroke="url(#g)" stroke-width="26"/><ellipse cx="200" cy="205" rx="118" ry="110" fill="none" stroke="#7a4d12" stroke-width="2" stroke-dasharray="4 12" opacity=".5"/><ellipse cx="200" cy="215" rx="100" ry="92" fill="none" stroke="url(#g)" stroke-width="12" opacity=".85"/>`,
  earrings: (t) =>
    `${bg(t)}${[140, 260].map((x) => `<circle cx="${x}" cy="110" r="11" fill="none" stroke="url(#g)" stroke-width="6"/><path d="M${x} 122 v26" stroke="url(#g)" stroke-width="5"/><path d="M${x - 34} 160 Q${x} 300 ${x + 34} 160 Z" fill="url(#g)"/><circle cx="${x}" cy="210" r="13" fill="#0f6b55"/><circle cx="${x - 4}" cy="206" r="3" fill="#fff" opacity=".8"/>`).join("")}`,
  pendant: (t) =>
    `${bg(t)}<path d="M150 70 L200 150 L250 70" fill="none" stroke="url(#g)" stroke-width="5"/><path d="M200 150 C140 170 140 260 200 300 C260 260 260 170 200 150Z" fill="url(#g)"/><path d="M200 180 C170 195 170 250 200 272 C230 250 230 195 200 180Z" fill="#a01c3b"/><circle cx="192" cy="205" r="5" fill="#fff" opacity=".7"/>`,
  chain: (t) =>
    `${bg(t)}${Array.from({ length: 11 })
      .map((_, i) => {
        const a = (Math.PI * (i + 0.5)) / 11;
        const x = 200 - Math.cos(a) * 125;
        const y = 120 + Math.sin(a) * 150;
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="15" ry="9" transform="rotate(${((a * 180) / Math.PI - 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="none" stroke="url(#g)" stroke-width="6"/>`;
      })
      .join("")}`,
  coin: (t) =>
    `${bg(t)}<circle cx="200" cy="200" r="118" fill="url(#g)"/><circle cx="200" cy="200" r="98" fill="none" stroke="#9c6b1c" stroke-width="3" opacity=".55"/><text x="200" y="196" text-anchor="middle" font-family="Georgia,serif" font-size="46" font-weight="700" fill="#6b4413">24K</text><text x="200" y="236" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#6b4413" letter-spacing="3">999.9</text>`,
  "silver-coin": (t) =>
    `${bg(t)}<circle cx="200" cy="200" r="118" fill="url(#s)"/><circle cx="200" cy="200" r="98" fill="none" stroke="#6d747d" stroke-width="3" opacity=".5"/><text x="200" y="196" text-anchor="middle" font-family="Georgia,serif" font-size="40" font-weight="700" fill="#4b5158">Ag</text><text x="200" y="236" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#4b5158" letter-spacing="3">999</text>`,
  bar: (t) =>
    `${bg(t)}<path d="M110 250 L150 150 L290 150 L330 250 Z" fill="url(#g)"/><path d="M150 150 L290 150 L270 175 L170 175Z" fill="#fff3c9" opacity=".55"/><text x="220" y="225" text-anchor="middle" font-family="Georgia,serif" font-size="26" font-weight="700" fill="#6b4413">10 g · 999.9</text>`,
  category: (t) => `${bg(t)}<circle cx="200" cy="190" r="70" fill="none" stroke="url(#g)" stroke-width="16"/>`,
};

function bannerSvg(kind: string) {
  const palettes: Record<string, [string, string, string, string]> = {
    "banner-festive": ["#5e0a20", "#8e1a36", "Festive gold edit", "Making charges from 6%"],
    "banner-bridal": ["#3d0c15", "#73213a", "Bridal collection", "Temple & antique sets"],
    "banner-coins": ["#4a2a06", "#9a6200", "Gold coins & bars", "24K 999.9 · BIS hallmarked"],
  };
  const [a, b, rawTitle, rawSub] = palettes[kind] ?? palettes["banner-festive"];
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const title = esc(rawTitle);
  const sub = esc(rawSub);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420">${GOLD}<linearGradient id="bb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><rect width="1200" height="420" fill="url(#bb)"/><g opacity=".09" stroke="#e2c88f">${Array.from({ length: 40 })
    .map((_, i) => `<line x1="${i * 34}" y1="0" x2="${i * 34 - 300}" y2="420"/>`)
    .join("")}</g><circle cx="930" cy="210" r="150" fill="none" stroke="url(#g)" stroke-width="26"/><circle cx="930" cy="210" r="104" fill="none" stroke="url(#g)" stroke-width="8" opacity=".7"/><path d="M900 60 l30-32 l30 32 l-30 28z" fill="#fff" opacity=".9"/><text x="80" y="190" font-family="Georgia,serif" font-size="64" fill="#fbecc4">${title}</text><text x="82" y="250" font-family="Arial,sans-serif" font-size="28" fill="#f1dfe2" opacity=".85">${sub}</text></svg>`;
}

const cache = new Map<string, string>();

export function demoArtDataUri(kind: string, tone = "#f7ead6"): string {
  const key = `${kind}|${tone}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let svg: string;
  if (kind.startsWith("banner-")) {
    svg = bannerSvg(kind);
  } else {
    const draw = ART[kind] ?? ART.category;
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs>${GOLD}${SILVER}</defs>${draw(tone)}</svg>`;
  }
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}

/** Upload ids used by the demo catalog map to artwork: `demo_<kind>_<tone index>`. */
const TONES = ["#f7ead6", "#f3e3e8", "#e9efe6", "#efe7f6", "#f6eedc", "#e6eef4"];

export function demoUploadUrl(uploadId: string): string | null {
  const m = /^demo_([a-z-]+?)(?:_(\d+))?$/.exec(uploadId);
  if (!m) return null;
  const tone = TONES[Number(m[2] ?? 0) % TONES.length];
  return demoArtDataUri(m[1], tone);
}
