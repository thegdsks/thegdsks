// Studio-floor profile cards: dark hero with a product orbit, number strip and a colour-blocked product bento.
// Usage: node profile/studio/generate.mjs [outDir]   (STATIC=1 renders the end state for screenshots)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = process.argv[2] ?? "profile/studio/out";
const stats = JSON.parse(readFileSync(new URL("../assets/stats.json", import.meta.url), "utf8"));
const b64 = (u) => readFileSync(new URL(u, import.meta.url)).toString("base64");
const FONT_CSS = `@font-face{font-family:'I';src:url(data:font/woff;base64,${b64("../fonts/inter-subset.woff")}) format('woff');font-weight:100 900}@font-face{font-family:'M';src:url(data:font/woff;base64,${b64("../paper/fonts/geist-mono-500.woff")}) format('woff');font-weight:500}`;
const SANS = "I, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "M, ui-monospace, Menlo, monospace";

const INK = "#0B0B09";
const ORANGE = "#F97316";
// Brand tile colours from each product's own site; fg is the readable text colour on that fill.
const PRODUCTS = [
  { id: "levelrail", name: "Levelrail", tag: "DEPLOY", fill: "#8B5CF6", fill2: "#4C1D95", fg: "#FFFFFF", desc: ["Self-hosted deploys. Git push, HTTPS,", "logs and rollback. No Kubernetes."] },
  { id: "thesvg", name: "theSVG", tag: "OPEN SOURCE", fill: "#FF7A1A", fill2: "#C2410C", fg: "#FFFFFF", desc: ["7,600+ brand logos and 372 UI icons.", "React, Vue, CDN, CLI and MCP."] },
  { id: "theauth", name: "theAuth", tag: "AUTH", fill: "#06B6D4", fill2: "#0C4A6E", fg: "#FFFFFF", desc: ["Auth for AI agents and humans.", "MCP OAuth 2.1, delegation, audit."] },
  { id: "profclaw", name: "profClaw", tag: "AGENTS", fill: "#F43F8E", fill2: "#831843", fg: "#FFFFFF", desc: ["Self-hosted AI agent engine.", "22 channels, 65 tools, any LLM."] },
  { id: "askverdict", name: "AskVerdict", tag: "AI", fill: "#10B981", fill2: "#064E3B", fg: "#FFFFFF", desc: ["Multi-agent AI debate engine.", "Many models, one verdict."] },
  { id: "stacklit", name: "Stacklit", tag: "DEV TOOL", fill: "#FFD21F", fill2: "#B45309", fg: "#1F1600", desc: ["Codebase context for AI agents", "in about 250 tokens."] },
];

const og = (id) => `data:image/jpeg;base64,${b64(`./og/${id}.jpg`)}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e5 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

// Shared motion. Entrances end inside about 1.5s because GitHub plays SVG animation on load, not on scroll.
const ANIM = `@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes tilein{0%{opacity:0;transform:translateY(40px) scale(.9) rotate(-3deg)}60%{opacity:1;transform:translateY(-5px) scale(1.02) rotate(.6deg)}100%{opacity:1;transform:none}}
@keyframes sheen{0%{transform:translateX(-340px) skewX(-20deg)}30%,100%{transform:translateX(640px) skewX(-20deg)}}
@keyframes pulse{50%{opacity:.25}}
@keyframes nudge{50%{transform:translateX(4px)}}
.r{animation:rise .7s cubic-bezier(.2,.7,.2,1) both}
.t{transform-box:fill-box;transform-origin:50% 60%;animation:tilein .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes pop{from{opacity:0;transform:scale(.3)}to{transform:none}}
.p{transform-box:fill-box;transform-origin:center;animation:pop .45s cubic-bezier(.2,.8,.3,1.3) both}
@keyframes tick{from{transform:scaleY(0)}to{transform:none}}
.tk{transform-box:fill-box;transform-origin:center;animation:tick .5s cubic-bezier(.2,.8,.3,1.3) both}
.sh{animation:sheen 5.5s ease-in-out infinite}
.pl{animation:pulse 1.8s ease-in-out infinite}
.nu{animation:nudge 1.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}${process.env.STATIC === "1" ? "*{animation:none!important}.sh{display:none}" : ""}`;
const dl = (c, d) => `class="${c}" style="animation-delay:${d}s"`;
const MONO_CSS = `@font-face{font-family:'M';src:url(data:font/woff;base64,${b64("../paper/fonts/geist-mono-500.woff")}) format('woff');font-weight:500}`;
const wrap = (w, h, alt, body, defs = "", css = FONT_CSS) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}"><defs><style>${css}${ANIM}text{font-kerning:normal}</style><linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><filter id="lift" x="-8%" y="-8%" width="116%" height="124%"><feDropShadow dx="0" dy="1" stdDeviation=".7" flood-color="#000" flood-opacity=".5"/><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000" flood-opacity=".42"/></filter>${defs}</defs>${body}</svg>`;

// Real brand logos (mono, from theSVG via its CLI), vendored in ../paper/logos and tinted per use.
const logo = (id) => {
  const raw = readFileSync(new URL(`../paper/logos/${id}.svg`, import.meta.url), "utf8");
  const vb = raw.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
  const head = raw.split(">")[0];
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title>[^<]*<\/title>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  return { vb, inner, stroked: /stroke="currentColor"/.test(head), noFill: /fill="none"/.test(head) };
};
// Some marks carry a lot of padding in their own box; scale them up around the same centre so every logo fills its block alike.
const LOGO_SCALE = { profclaw: 1.4, askverdict: 1.5 };
const logoMark = (id, x0, y0, size0, color) => {
  const k = LOGO_SCALE[id] ?? 1;
  const size = size0 * k;
  const x = x0 - (size - size0) / 2;
  const y = y0 - (size - size0) / 2;
  const l = logo(id);
  const attrs = l.stroked ? `fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"` : l.noFill ? `fill="none" color="${color}"` : `fill="${color}" color="${color}"`;
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${l.vb}" ${attrs}>${l.inner.replace(/currentColor/g, color)}</svg>`;
};

// Grain glow: soft radial blobs plus the same shapes cut through thresholded noise, so the glow breaks into dots.
const glow = (blobs) => {
  const grads = blobs.map((b, i) => `<radialGradient id="gb${i}"><stop offset="0" stop-color="${b.c}" stop-opacity="${b.a}"/><stop offset="1" stop-color="${b.c}" stop-opacity="0"/></radialGradient>`).join("");
  const shapes = blobs.map((b, i) => `<ellipse cx="${b.x}" cy="${b.y}" rx="${b.rx}" ry="${b.ry}" fill="url(#gb${i})"/>`).join("");
  return {
    defs: `${grads}<filter id="gf" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="2" seed="3" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  9 0 0 0 -4.3" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`,
    body: `<g opacity="0.8">${shapes}</g><g filter="url(#gf)" opacity="0.9">${shapes}</g>`,
  };
};

const GLINR = logo("glinr");

// Layered display mark: soft shadow, orange glow, offset outline echo, vertical gradient fill, thin highlight and a sweeping sheen.
function bigMark({ x, y, size, ls, top, bottom, sweepW }) {
  const base = `x="${x}" y="${y}" font-family="${SANS}" font-weight="500" font-size="${size}" letter-spacing="${ls}"`;
  const sheen = process.env.STATIC === "1" ? "" : `<animateTransform attributeName="gradientTransform" type="translate" values="${-sweepW} 0;${size * 4.4} 0;${size * 4.4} 0" keyTimes="0;.5;1" dur="6.5s" begin="1.4s" repeatCount="indefinite"/>`;
  return `<defs><linearGradient id="gtw" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bottom}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#A9A9B2"/></linearGradient><linearGradient id="gto" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${bottom}"><stop offset="0" stop-color="#FFC48F"/><stop offset=".55" stop-color="#F97316"/><stop offset="1" stop-color="#B84E06"/></linearGradient><linearGradient id="gsw" gradientUnits="userSpaceOnUse" gradientTransform="translate(${-sweepW} 0)" x1="${x}" y1="0" x2="${x + sweepW}" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>${sheen}</linearGradient><filter id="mb1" x="-20%" y="-30%" width="140%" height="170%"><feGaussianBlur stdDeviation="${size * 0.07}"/></filter><filter id="mb2" x="-30%" y="-40%" width="160%" height="190%"><feGaussianBlur stdDeviation="${size * 0.12}"/></filter></defs>
<g ${dl("r", 0.2)}>
<text ${base} fill="#000" fill-opacity=".65" transform="translate(0 ${size * 0.07})" filter="url(#mb1)">GDS K S</text>
<text ${base} fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="1.4" transform="translate(${size * 0.045} ${size * 0.045})">GDS K S</text>
<text ${base} fill="transparent" filter="url(#mb2)">GDS <tspan fill="${ORANGE}" fill-opacity=".7">K S</tspan></text>
<text ${base} stroke="#fff" stroke-opacity=".35" stroke-width=".8" paint-order="stroke" fill="url(#gtw)">GDS <tspan fill="url(#gto)">K S</tspan></text>
<text ${base} fill="url(#gsw)">GDS K S</text>
</g>`;
}

function hero() {
  const W = 1200;
  const H = 440;
  const cx = 930;
  const cy = 215;
  const g = glow([
    { x: 900, y: 0, rx: 420, ry: 240, c: "#8B5CF6", a: 0.5 },
    { x: 560, y: 0, rx: 260, ry: 190, c: "#22D3EE", a: 0.38 },
    { x: 1150, y: 40, rx: 240, ry: 200, c: ORANGE, a: 0.42 },
    { x: 200, y: 0, rx: 260, ry: 170, c: "#34D399", a: 0.28 },
  ]);
  const orbit = (r) => `M${cx - r} ${cy} a${r} ${r} 0 1 1 ${2 * r} 0 a${r} ${r} 0 1 1 ${-2 * r} 0`;
  const rings = [95, 150, 205];
  // Two products per ring, spread by start offset so they never bunch up.
  const nodes = [
    { p: PRODUCTS[0], r: 95, dur: 14, off: 0 },
    { p: PRODUCTS[1], r: 95, dur: 14, off: 7 },
    { p: PRODUCTS[2], r: 150, dur: 22, off: 2 },
    { p: PRODUCTS[3], r: 150, dur: 22, off: 13 },
    { p: PRODUCTS[4], r: 205, dur: 31, off: 6 },
    { p: PRODUCTS[5], r: 205, dur: 31, off: 21 },
  ];
  const nodeSvg = nodes
    .map(({ p, r, dur, off }) => `<g><animateMotion dur="${dur}s" begin="-${off}s" repeatCount="indefinite" path="${orbit(r)}"/><circle r="19" fill="${p.fill}"/>${logoMark(p.id, -10, -10, 20, p.fg)}</g>`)
    .join("");
  const pills = PRODUCTS.map((p, i) => {
    const x = 64 + i * 0; // laid out below with measured widths
    return { p, i, x };
  });
  let px = 64;
  const chips = PRODUCTS.map((p, i) => {
    const w = Math.round(p.name.length * 9.2 + 44);
    const s = `<g ${dl("r", 0.55 + i * 0.06)}><rect x="${px}" y="366" width="${w}" height="34" rx="17" fill="#ffffff" fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.14"/><circle cx="${px + 18}" cy="383" r="5" fill="${p.fill}"/><text x="${px + 32}" y="388" font-family="${SANS}" font-weight="600" font-size="14" fill="#F4F4F1">${esc(p.name)}</text></g>`;
    px += w + 10;
    return s;
  }).join("");
  const defs = `${g.defs}<linearGradient id="nm" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="900" y2="0"><stop offset="0" stop-color="#F4F4F1"/><stop offset=".45" stop-color="#F4F4F1"/><stop offset=".5" stop-color="${ORANGE}"/><stop offset=".55" stop-color="#F4F4F1"/><stop offset="1" stop-color="#F4F4F1"/><animateTransform attributeName="gradientTransform" type="translate" values="-900 0;900 0;900 0" keyTimes="0;.4;1" dur="8s" begin="1.4s" repeatCount="indefinite"/></linearGradient><clipPath id="hc"><rect width="${W}" height="${H}" rx="24"/></clipPath><clipPath id="av"><circle cx="92" cy="62" r="25"/></clipPath><linearGradient id="bw" gradientUnits="userSpaceOnUse" x1="64" y1="0" x2="360" y2="0"><stop offset="0" stop-color="#F4F4F1"/><stop offset=".3" stop-color="#F4F4F1"/><stop offset=".42" stop-color="#FF7A1A"/><stop offset=".62" stop-color="#FFD21F"/><stop offset=".82" stop-color="#F43F8E"/><stop offset="1" stop-color="#A855F7"/></linearGradient><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7A1A"/><stop offset=".5" stop-color="#F43F8E"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient><radialGradient id="core"><stop offset="0" stop-color="#FFB27A"/><stop offset="1" stop-color="${ORANGE}"/></radialGradient>`;
  const body = `<g clip-path="url(#hc)"><rect width="${W}" height="${H}" fill="${INK}"/>${g.body}
<text x="40" y="428" font-family="${MONO}" font-weight="500" font-size="24" letter-spacing="9" fill="#fff" fill-opacity=".06">DESIGNER  ENGINEER  WRITER  DEVELOPER  FOUNDER  PHILOSOPHER</text>
<g ${dl("r", 0.1)}>${rings.map((r, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity="${0.22 - i * 0.04}" ${i === 1 ? 'stroke-dasharray="3 8"' : ""}/>`).join("")}</g>
<defs><clipPath id="pc"><circle cx="${cx}" cy="${cy}" r="50"/></clipPath></defs>
<circle cx="${cx}" cy="${cy}" r="59" fill="url(#rg)"/><circle cx="${cx}" cy="${cy}" r="54" fill="#0B0B09"/>
<image href="${og("avatar")}" x="${cx - 50}" y="${cy - 50}" width="100" height="100" clip-path="url(#pc)" preserveAspectRatio="xMidYMid slice"/>
${nodeSvg}
<g ${dl("r", 0.05)}><svg x="70" y="40" width="44" height="44" viewBox="${GLINR.vb}" fill="#fff"><g>${GLINR.inner}</g></svg></g>
<text ${dl("r", 0.1)} x="134" y="56" font-family="${MONO}" font-weight="500" font-size="14" letter-spacing="3.6" fill="url(#rg)">GAGAN DEEP SINGH</text>
<text ${dl("r", 0.12)} x="134" y="78" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="2.4" fill="#B8B8AE">GLINR STUDIOS  /  OPEN SOURCE</text>
${bigMark({ x: 58, y: 222, size: 150, ls: -9, top: 112, bottom: 224, sweepW: 150 })}
<text ${dl("r", 0.5)} x="64" y="282" font-family="${SANS}" font-weight="600" font-size="30" letter-spacing="-1" fill="url(#bw)">Building What Matters.</text>
<text ${dl("r", 0.58)} x="64" y="322" font-family="${SANS}" font-weight="500" font-size="19" fill="#C9C9BF">Developer infrastructure in public. Next up: <tspan fill="#FACC15" font-weight="700">robotics</tspan>.</text>
${chips}</g>`;
  return wrap(W + 16, H + 16, "Gagan Deep Singh, founder of GLINR Studios: Levelrail, theSVG, theAuth, profClaw, AskVerdict and Stacklit. Next up robotics.", `<g transform="translate(8,8)">${body}</g>`, defs);
}

const COLS = [
  ["GITHUB STARS", () => fmt(stats.stars) + "+", "#F97316"],
  ["NPM DOWNLOADS / MO", () => fmt(stats.month) + "+", "#A78BFA"],
  ["PACKAGES", () => stats.packages + "+", "#22D3EE"],
  ["CDN HITS / MO", () => fmt(stats.cdn) + "+", "#F472B6"],
];
function strip() {
  const W = 1200;
  const H = 150;
  const cw = (W - 24) / 4;
  const body = `<defs><clipPath id="sc"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs><g clip-path="url(#sc)"><rect width="${W}" height="${H}" fill="#14140F"/>${`<rect width="${W}" height="${H}" rx="22" fill="url(#sheen)"/><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="#fff" stroke-opacity=".1"/>`}${COLS.map(([label, val, c], i) => {
    const x = 12 + i * cw + 40;
    return `${i ? `<line x1="${12 + i * cw}" y1="34" x2="${12 + i * cw}" y2="116" stroke="#fff" stroke-opacity=".1"/>` : ""}<rect ${dl("r", 0.1 + i * 0.1)} x="${x}" y="38" width="28" height="4" rx="2" fill="${c}"/><text ${dl("r", 0.15 + i * 0.1)} x="${x}" y="68" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="#9C9C92">${label}</text><text ${dl("r", 0.2 + i * 0.1)} x="${x}" y="118" font-family="${SANS}" font-weight="600" font-size="52" letter-spacing="-1.8" fill="${c}">${esc(val())}</text>`;
  }).join("")}</g>`;
  return wrap(W + 16, H + 16, `GitHub stars ${stats.stars}, npm downloads per month ${stats.month}, ${stats.packages} packages, CDN hits per month ${stats.cdn}`, `<g transform="translate(8,8)">${body}</g>`);
}

// Product illustrations in a 240x120 box, drawn in the tile text colour (fg) on its fill.
function illus(id, fg, fill) {
  const m = `font-family="${MONO}" font-weight="500"`;
  const panel = `<rect width="240" height="120" rx="14" fill="#000" fill-opacity=".28"/>`;
  const art = {
    levelrail: `${panel}${[0, 1, 2].map((i) => `<circle cx="${16 + i * 14}" cy="16" r="4" fill="${fg}" fill-opacity=".5"/>`).join("")}<text x="16" y="46" ${m} font-size="11" fill="${fg}">$ git push levelrail</text><text x="16" y="66" ${m} font-size="11" fill="${fg}" fill-opacity=".75">build ........ ok</text><text x="16" y="86" ${m} font-size="11" fill="${fg}" fill-opacity=".75">https://app.live</text><rect x="16" y="100" width="208" height="6" rx="3" fill="${fg}" fill-opacity=".2"/><rect x="16" y="100" height="6" rx="3" fill="${fg}"><animate attributeName="width" values="0;208;208" keyTimes="0;.6;1" dur="3.6s" repeatCount="indefinite"/></rect>`,
    thesvg: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const x = (i % 4) * 62; const y = Math.floor(i / 4) * 64; const hot = i === 5; const c = hot ? fill : fg; const cx = x + 26; const cy = y + 26; const shape = [`<circle cx="${cx}" cy="${cy}" r="12" fill="none" stroke="${c}" stroke-width="2.5"/>`, `<rect x="${cx - 11}" y="${cy - 11}" width="22" height="22" rx="3" fill="none" stroke="${c}" stroke-width="2.5"/>`, `<path d="M${cx} ${cy - 13}L${cx + 13} ${cy + 10}L${cx - 13} ${cy + 10}Z" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`, `<path d="M${cx} ${cy - 14}L${cx + 14} ${cy}L${cx} ${cy + 14}L${cx - 14} ${cy}Z" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`][i % 4]; return `<rect x="${x}" y="${y}" width="52" height="52" rx="13" fill="${hot ? fg : fg}" fill-opacity="${hot ? 0.95 : 0.14}"/>${shape}`; }).join(""),
    theauth: `${panel}<circle cx="32" cy="34" r="14" fill="${fg}"/><circle cx="32" cy="31" r="4.5" fill="${fill}"/><path d="M23 44a9 7 0 0 1 18 0z" fill="${fill}"/><text x="56" y="31" ${m} font-size="12" fill="${fg}">build-bot</text><text x="56" y="46" ${m} font-size="10" fill="${fg}" fill-opacity=".7">agent identity</text><rect x="16" y="62" width="82" height="20" rx="10" fill="${fg}" fill-opacity=".22"/><text x="28" y="76" ${m} font-size="10" fill="${fg}">deploy:read</text><rect x="106" y="62" width="52" height="20" rx="10" fill="${fg}" fill-opacity=".22"/><text x="118" y="76" ${m} font-size="10" fill="${fg}">audit</text><text x="16" y="105" ${m} font-size="10" fill="${fg}" fill-opacity=".75">expires in 15m</text><rect x="110" y="99" width="114" height="6" rx="3" fill="${fg}" fill-opacity=".2"/><rect x="110" y="99" height="6" rx="3" fill="${fg}"><animate attributeName="width" values="114;0;0" keyTimes="0;.9;1" dur="6s" repeatCount="indefinite"/></rect>`,
    profclaw: `<rect x="0" y="0" width="156" height="32" rx="16" fill="${fg}" fill-opacity=".2"/><rect x="16" y="12" width="90" height="8" rx="4" fill="${fg}" fill-opacity=".55"/><rect x="84" y="44" width="156" height="32" rx="16" fill="${fg}"/><rect x="100" y="56" width="104" height="8" rx="4" fill="${fill}" fill-opacity=".7"/><rect x="0" y="88" width="84" height="32" rx="16" fill="${fg}" fill-opacity=".2"/>${[0, 1, 2].map((i) => `<circle cx="${24 + i * 18}" cy="104" r="4" fill="${fg}"><animate attributeName="opacity" values=".25;1;.25" dur="1.2s" begin="${i * 0.2}s" repeatCount="indefinite"/></circle>`).join("")}`,
    askverdict: [[150, 0], [118, 1], [172, 2], [92, 3]].map(([w, i]) => `<circle cx="7" cy="${14 + i * 29}" r="7" fill="${fg}" fill-opacity=".5"/><rect x="22" y="${6 + i * 29}" width="${w - 22}" height="16" rx="8" fill="${fg}" fill-opacity=".3"/><path d="M${w + 6} ${14 + i * 29}C${w + 30} ${14 + i * 29} 176 60 190 60" fill="none" stroke="${fg}" stroke-opacity=".5" stroke-width="2"/>`).join("") + `<rect x="170" y="38" width="70" height="44" rx="22" fill="${fg}"/><text x="205" y="64" text-anchor="middle" ${m} font-size="11" fill="${fill}">VERDICT</text>`,
    stacklit: `<text x="0" y="14" ${m} font-size="11" fill="${fg}" fill-opacity=".75">BEFORE  50,000 tokens</text><rect x="0" y="24" width="240" height="22" rx="11" fill="${fg}" fill-opacity=".25"/><text x="0" y="82" ${m} font-size="11" fill="${fg}">AFTER  250 tokens</text><rect x="0" y="92" width="240" height="22" rx="11" fill="${fg}" fill-opacity=".12"/><rect x="0" y="92" height="22" rx="11" fill="${fg}"><animate attributeName="width" values="240;6;6" keyTimes="0;.35;1" dur="4s" repeatCount="indefinite"/></rect>`,
  };
  return art[id] ?? "";
}

// Bento tile: solid brand fill, outline rings, a large watermark logo, real logo, live numbers, sweeping shine.
function tile(p, w, wide, i) {
  const H = 356;
  const x0 = 6;
  const cw = w - 12;
  const ch = H - 12;
  const s = stats.projects.find((x) => x.id === p.id);
  const meta = p.id === "askverdict" ? "ASKVERDICT.AI" : [s?.stars ? `${fmt(s.stars)} STARS` : "", s?.month ? `${fmt(s.month)} / MO` : ""].filter(Boolean).join("  \u00b7  ");
  const id = `${p.id}${w}`;
  const defs = `<clipPath id="c${id}"><rect x="${x0}" y="6" width="${cw}" height="${ch}" rx="22"/></clipPath><linearGradient id="s${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="d${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.fill}"/><stop offset="1" stop-color="${p.fill2}"/></linearGradient><radialGradient id="m${id}" cx=".78" cy=".62" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="b${id}" x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation="2.4"/></filter><mask id="k${id}"><rect x="${x0}" y="6" width="${cw}" height="${ch}" fill="url(#m${id})"/></mask><radialGradient id="h${id}" cx=".15" cy="0" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
  const body = `<rect x="${x0}" y="6" width="${cw}" height="${ch}" rx="22" fill="#000" filter="url(#lift)"/><g ${dl("t", 0.08 + i * 0.1)}><g clip-path="url(#c${id})"><rect x="${x0}" y="6" width="${cw}" height="${ch}" fill="url(#d${id})"/><rect x="${x0}" y="6" width="${cw}" height="${ch}" fill="url(#h${id})"/>
<circle cx="${x0 + cw - 24}" cy="${H - 18}" r="130" fill="none" stroke="${p.fg}" stroke-opacity=".16" stroke-width="1.5"/><circle cx="${x0 + cw - 24}" cy="${H - 18}" r="86" fill="none" stroke="${p.fg}" stroke-opacity=".16" stroke-width="1.5"/>
<image href="${og(p.id)}" x="${x0}" y="6" width="${cw}" height="${ch}" preserveAspectRatio="xMidYMid slice" mask="url(#k${id})" filter="url(#b${id})" opacity=".34"/>
<g transform="${wide ? `translate(${x0 + cw - 26 - 240},168)` : `translate(${x0 + cw - 26 - 240 * Math.min(1, (cw - 52) / 240)},184) scale(${Math.min(1, (cw - 52) / 240).toFixed(3)})`}">${illus(p.id, p.fg, p.fill2)}</g>
<rect x="${x0 + 26}" y="30" width="44" height="44" rx="12" fill="${p.fg}" fill-opacity=".14"/>${logoMark(p.id, x0 + 36, 40, 24, p.fg)}
<text x="${x0 + cw - 26}" y="56" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.8" fill="${p.fg}" fill-opacity=".75">${p.tag}</text>
<text x="${x0 + 26}" y="122" font-family="${SANS}" font-weight="600" font-size="${wide ? 40 : 34}" letter-spacing="-1.2" fill="${p.fg}">${esc(p.name)}</text>
<text x="${x0 + 26}" y="152" font-family="${SANS}" font-weight="500" font-size="${wide ? 14.5 : 12.5}" fill="${p.fg}" fill-opacity=".86">${esc(p.desc[0])}</text>
<text x="${x0 + 26}" y="172" font-family="${SANS}" font-weight="500" font-size="${wide ? 14.5 : 12.5}" fill="${p.fg}" fill-opacity=".86">${esc(p.desc[1])}</text>
<text x="${x0 + 26}" y="${H - 30}" font-family="${MONO}" font-weight="500" font-size="11.5" letter-spacing="1.2" fill="${p.fg}">${meta}</text>
<g class="nu"><circle cx="${x0 + cw - 40}" cy="${H - 34}" r="16" fill="${p.fg}"/><path d="M${x0 + cw - 47} ${H - 34}h12m-5 -5l5 5l-5 5" fill="none" stroke="${p.fill2}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
<rect class="sh" x="${x0}" y="6" width="90" height="${ch}" fill="url(#s${id})"/><rect x="${x0 + .5}" y="6.5" width="${cw - 1}" height="${ch - 1}" rx="22" fill="none" stroke="#fff" stroke-opacity=".24"/><path d="M${x0 + 26} 7.5H${x0 + cw - 26}" stroke="#fff" stroke-opacity=".55" stroke-width="1" stroke-linecap="round"/></g></g>`;
  return wrap(w, H, `${p.name}: ${p.desc.join(" ")}`, body, defs);
}


const HIST_FILE = new URL("./release-history.json", import.meta.url);
// Release dates per product for the shipping lanes; refreshed with a token, otherwise the cached file is used.
const HIST_REPOS = { levelrail: "glincker/levelrail", thesvg: "glincker/thesvg", theauth: "glincker/theauth" };
if (process.env.GITHUB_TOKEN) {
  try {
    const since = new Date(Date.now() - 380 * 864e5).toISOString().slice(0, 10);
    const fresh = {};
    for (const [id, repo] of Object.entries(HIST_REPOS)) {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100`, { headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "user-agent": "profile-generator" } });
      if (!res.ok) throw new Error(String(res.status));
      fresh[id] = [...new Set((await res.json()).filter((r) => !r.draft).map((r) => r.published_at.slice(0, 10)).filter((d) => d >= since))].sort();
    }
    writeFileSync(HIST_FILE, `${JSON.stringify(fresh, null, 1)}\n`);
  } catch {
    // keep the cached history
  }
}


// Typewriter text: one tspan per character, revealed in order with SMIL; a blinking cursor follows. Static mode shows plain text.
function typed(text, x, y, attrs, delay, animated, step = 0.05) {
  if (!animated) return `<text x="${x}" y="${y}" ${attrs}>${esc(text)}</text>`;
  const chars = [...text].map((ch, i) => `<tspan opacity="0">${esc(ch)}<set attributeName="opacity" to="1" begin="${(delay + i * step).toFixed(2)}s" fill="freeze"/></tspan>`).join("");
  const end = delay + text.length * step;
  const cursor = `<tspan fill="${ORANGE}" opacity="0">|<set attributeName="opacity" to="1" begin="${end.toFixed(2)}s" fill="freeze"/><animate attributeName="opacity" values="1;0;1" dur="1.1s" begin="${(end + 0.4).toFixed(2)}s" repeatCount="indefinite"/></tspan>`;
  return `<text x="${x}" y="${y}" ${attrs}>${chars}${cursor}</text>`;
}

// Contribution heatmap: colour runs across the year through the product palette, depth is opacity.
function graph(W = 1200, n = 53) {
  const cal = JSON.parse(readFileSync(new URL("../paper/contributions.json", import.meta.url), "utf8"));
  const weeks = cal.weeks.slice(-n);
  const nz = weeks.flatMap((w) => w.contributionDays).map((d) => d.contributionCount).filter((n) => n > 0).sort((a, b) => a - b);
  const q = [0.25, 0.5, 0.75].map((f) => nz[Math.floor(nz.length * f)] ?? 1);
  const lvl = (n) => (n === 0 ? 0 : 1 + q.filter((v) => n > v).length);
  const alpha = [0.07, 0.38, 0.6, 0.82, 1];
  const stops = ["#8B5CF6", "#06B6D4", "#10B981", "#FFD21F", "#FF7A1A", "#F43F8E"];
  const mix = (a, b, t) => `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("")}`;
  const colorAt = (f) => { const x = f * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(x)); return mix(stops[i], stops[i + 1], x - i); };
  const gap = 4;
  const left = 40;
  const cell = (W - 2 * left - gap * (weeks.length - 1)) / weeks.length;
  const top = 160;
  const H = top + 7 * (cell + gap) + 40;
  const hist = JSON.parse(readFileSync(HIST_FILE, "utf8"));
  const start = new Date(weeks[0].contributionDays[0].date);
  const LANES = [["levelrail", "LEVELRAIL", "#8B5CF6"], ["thesvg", "THESVG", "#FF7A1A"], ["theauth", "THEAUTH", "#06B6D4"]];
  const inRange = (d) => new Date(d) >= start;
  const counts = Object.fromEntries(LANES.map(([id]) => [id, (hist[id] ?? []).filter(inRange).length]));
  const releaseTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const total = weeks.flatMap((w) => w.contributionDays).reduce((a, d) => a + d.contributionCount, 0);
  const animated = process.env.STATIC !== "1";
  const xOf = (d) => left + ((new Date(d) - start) / 864e5 / 7) * (cell + gap) + cell / 2;
  const cells = weeks
    .map((w, i) => w.contributionDays.map((d, j) => `<rect ${dl("p", (0.2 + i * 0.016 + j * 0.01).toFixed(2))} x="${(left + i * (cell + gap)).toFixed(1)}" y="${(top + j * (cell + gap)).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="3" fill="${colorAt(i / (weeks.length - 1))}" fill-opacity="${alpha[lvl(d.contributionCount)]}"/>`).join(""))
    .join("");
  const stat = (x, label, val, c, unit = "") => `<text x="${x}" y="40" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.6" fill="#9C9C92" text-anchor="end">${label}</text><text x="${x}" y="78" font-family="${SANS}" font-weight="600" font-size="34" letter-spacing="-1" fill="${c}" text-anchor="end">${val}${unit ? `<tspan font-family="${MONO}" font-weight="500" font-size="13" letter-spacing="1.4" fill="#9C9C92"> ${unit}</tspan>` : ""}</text>`;
  const body = `<defs><clipPath id="gc"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs><g clip-path="url(#gc)"><rect width="${W}" height="${H}" fill="#0B0B09"/>${`<rect width="${W}" height="${H}" rx="22" fill="url(#sheen)"/><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="#fff" stroke-opacity=".1"/>`}
<text ${dl("r", 0.05)} x="${left}" y="38" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.8" fill="#9C9C92">${n >= 53 ? "THE LAST 12 MONTHS" : "THE LAST 6 MONTHS"}</text>
${typed(`${releaseTotal} releases shipped.`, left, 80, `font-family="${SANS}" font-weight="600" font-size="${W > 800 ? 40 : 28}" letter-spacing="-1.4" fill="#F4F4F1"`, 0.25, animated)}
<text ${dl("r", 0.2)} x="${W - left}" y="38" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.6" fill="#9C9C92">${total.toLocaleString("en-US")} CONTRIBUTIONS</text>
${LANES.map(([id, name, c], i) => { const y = 114 + i * 15; const ds = (hist[id] ?? []).filter(inRange); const last = ds.at(-1); return `<line ${dl("d", 0.2 + i * 0.1)} x1="${left}" y1="${y}" x2="${W - left}" y2="${y}" stroke="#fff" stroke-opacity=".08"/><text x="${left}" y="${y - 5}" font-family="${MONO}" font-weight="500" font-size="9" letter-spacing="1.4" fill="${c}" fill-opacity=".9">${name}  ${counts[id]}</text>${ds.map((d) => { const x = xOf(d); return `<rect ${dl("tk", (1.1 + ((x - left) / (W - 2 * left)) * 1.3).toFixed(2))} x="${(x - 1.2).toFixed(1)}" y="${y - 6}" width="2.4" height="12" rx="1.2" fill="${c}"/>`; }).join("")}${last && animated ? `<circle cx="${xOf(last).toFixed(1)}" cy="${y}" r="3" fill="none" stroke="${c}" stroke-width="1.5"><animate attributeName="r" values="3;11" dur="2.4s" begin="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="2.4s" begin="2.6s" repeatCount="indefinite"/></circle>` : ""}`; }).join("")}
${cells}</g>`;
  return wrap(W + 16, H + 16, `Contribution graph with release lanes: ${releaseTotal} releases and ${total} contributions in the period`, `<g transform="translate(8,8)">${body}</g>`);
}

// One card per recent release: product colour, real logo, big version, date, a NEW chip for the last week.
const REL_COLORS = { levelrail: "#8B5CF6", thesvg: "#FF7A1A", theauth: "#06B6D4", profclaw: "#F43F8E", stacklit: "#FFD21F", askverdict: "#10B981", "glin-profanity": "#38BDF8" };
function releaseCard(r, i) {
  const W = 400;
  const H = 156;
  const c = REL_COLORS[r.product] ?? "#A78BFA";
  const hasLogo = ["levelrail", "thesvg", "theauth", "profclaw", "stacklit"].includes(r.product);
  const today = new Date(stats.updated);
  const when = new Date(`${r.date} ${today.getFullYear()}`);
  const days = Number.isNaN(when.getTime()) ? 99 : Math.round((today - when) / 864e5);
  const isNew = days >= 0 && days <= 7;
  const mark = hasLogo ? logoMark(r.product, 38, 38, 28, "#0B0B09") : `<text x="52" y="63" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="22" fill="#0B0B09">${esc(r.name[0].toUpperCase())}</text>`;
  const id = `r${i}`;
  const defs = `<clipPath id="c${id}"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20"/></clipPath><radialGradient id="g${id}" cx="0" cy=".5" r="1"><stop offset="0" stop-color="${c}" stop-opacity=".34"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const body = `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20" fill="#000" filter="url(#lift)"/><g ${dl("t", 0.1 + i * 0.07)}><g clip-path="url(#c${id})"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="#14140F"/><rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20" fill="url(#sheen)"/><rect x="6.5" y="6.5" width="${W - 13}" height="${H - 13}" rx="20" fill="none" stroke="#fff" stroke-opacity=".13"/><rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="url(#g${id})"/>
<rect x="6" y="${H - 10}" width="${W - 12}" height="4" fill="${c}"/>
<rect x="28" y="28" width="48" height="48" rx="14" fill="${c}"/>${mark}
<text x="92" y="48" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.8" fill="#9C9C92">${esc(r.name.toUpperCase())}</text>
<text x="92" y="86" font-family="${SANS}" font-weight="600" font-size="38" letter-spacing="-1.4" fill="#F4F4F1">${esc(r.version)}</text>
<text x="28" y="${H - 34}" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.2" fill="#C9C9BF">${esc(r.date.toUpperCase())}${i === 0 ? "  \u00b7  LATEST" : ""}</text>
${isNew ? `<rect x="${W - 86}" y="30" width="56" height="22" rx="11" fill="${c}"/><circle class="pl" cx="${W - 73}" cy="41" r="3.5" fill="#0B0B09"/><text x="${W - 65}" y="45" font-family="${MONO}" font-weight="500" font-size="10" letter-spacing="1.2" fill="#0B0B09">NEW</text>` : ""}
<g class="nu"><path d="M${W - 52} ${H - 38}h14m-5 -5l5 5l-5 5" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></g></g>`;
  return wrap(W, H, `${r.name} ${r.version}, released ${r.date}`, body, defs);
}

// Section headers, footer, writing cards and phone-width variants.
const SECTIONS = [["work", "01 / PRODUCTS", "Selected work", "#8B5CF6"], ["releases", "02 / SHIPPING", "Recent releases", "#FF7A1A"], ["writing", "03 / WRITING", "Latest writing", "#06B6D4"], ["stack", "04 / STACK", "Tools I use", "#10B981"]];
function header(eyebrow, title, c) {
  const W = 1200;
  const H = 72;
  const body = `<g transform="translate(8,8)"><defs><clipPath id="hh"><rect width="${W}" height="${H}" rx="22"/></clipPath><linearGradient id="hl" x1="0" x2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><g clip-path="url(#hh)"><rect width="${W}" height="${H}" fill="#0B0B09"/>${`<rect width="${W}" height="${H}" rx="22" fill="url(#sheen)"/><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="#fff" stroke-opacity=".1"/>`}
<rect ${dl("d", 0.1)} x="0" y="${H - 4}" width="${W}" height="4" fill="url(#hl)"/>
<text ${dl("r", 0.05)} x="32" y="30" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="2.2" fill="${c}">${eyebrow}</text>
<text ${dl("r", 0.15)} x="32" y="58" font-family="${SANS}" font-weight="600" font-size="26" letter-spacing="-.8" fill="#F4F4F1">${esc(title)}</text>
<circle cx="${W - 40}" cy="36" r="7" fill="${c}"/><circle class="pl" cx="${W - 40}" cy="36" r="7" fill="${c}"/></g></g>`;
  return wrap(W + 16, H + 16, title, body);
}
function footer() {
  const W = 1200;
  const body = `<g transform="translate(8,8)"><rect width="${W}" height="64" rx="22" fill="#0B0B09"/><circle class="pl" cx="40" cy="32" r="5" fill="#34D399"/><circle cx="40" cy="32" r="5" fill="#34D399"/><text x="58" y="37" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="#9C9C92">BUILT BY HAND  /  REFRESHED DAILY BY CRON  /  LAST RUN ${stats.updated}</text><text x="${W - 36}" y="37" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="#FF7A1A">GLINR STUDIOS</text></g>`;
  return wrap(W + 16, 80, `Built by hand, refreshed daily. Last run ${stats.updated}`, body);
}
const WRITE_COLORS = ["#FF7A1A", "#8B5CF6", "#06B6D4"];
// Article thumbnails are fetched once, shrunk to a small JPEG and cached in ./writing-img so the card can embed them.
async function fetchThumb(a, i) {
  const out = new URL(`./writing-img/${i}.jpg`, import.meta.url).pathname;
  if (!a.image) return;
  try {
    mkdirSync(new URL("./writing-img/", import.meta.url).pathname, { recursive: true });
    const res = await fetch(a.image);
    if (!res.ok) return;
    const tmp = `${out}.src`;
    writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    try {
      execFileSync("convert", [tmp, "-resize", "560x", "-quality", "62", out]);
    } catch {
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "62", "--resampleWidth", "560", tmp, "--out", out], { stdio: "ignore" });
    }
    execFileSync("rm", ["-f", tmp]);
  } catch {
    // keep any cached thumbnail, otherwise the card renders text only
  }
}
function writingCard(a, i) {
  const W = 400;
  const H = 268;
  const thumb = existsSync(new URL(`./writing-img/${i}.jpg`, import.meta.url)) ? `data:image/jpeg;base64,${b64(`./writing-img/${i}.jpg`)}` : "";
  const c = WRITE_COLORS[i % 3];
  const words = a.title.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 25) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  lines.push(cur);
  const shown = lines.slice(0, 3);
  if (lines.length > 3) shown[2] = `${shown[2].replace(/[.,]?$/, "")}...`;
  const text = shown.map((l, j) => `<text x="28" y="${thumb ? 160 + j * 26 : 86 + j * 28}" font-family="${SANS}" font-weight="600" font-size="${thumb ? 20 : 22}" letter-spacing="-.4" fill="#F4F4F1">${esc(l)}</text>`).join("");
  const defs = `<clipPath id="wc"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20"/></clipPath><radialGradient id="wg" cx="1" cy="0" r="1"><stop offset="0" stop-color="${c}" stop-opacity=".4"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14140F" stop-opacity="0"/><stop offset="1" stop-color="#14140F"/></linearGradient>`;
  const body = `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20" fill="#000" filter="url(#lift)"/><g ${dl("t", 0.1 + i * 0.08)}><g clip-path="url(#wc)"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="#14140F"/><rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20" fill="url(#sheen)"/><rect x="6.5" y="6.5" width="${W - 13}" height="${H - 13}" rx="20" fill="none" stroke="#fff" stroke-opacity=".13"/>${thumb ? `<image href="${thumb}" x="6" y="6" width="${W - 12}" height="130" preserveAspectRatio="xMidYMid slice"/><rect x="6" y="6" width="${W - 12}" height="130" fill="url(#wf)"/>` : `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="url(#wg)"/>`}<rect x="6" y="6" width="5" height="${H - 12}" fill="${c}"/>
<rect x="26" y="${thumb ? 22 : 28}" width="${a.source.length * 8 + 22}" height="24" rx="12" fill="${thumb ? "#0B0B09" : "none"}" fill-opacity=".72"/><text x="37" y="${thumb ? 38 : 44}" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.8" fill="${c}">${esc(a.source.toUpperCase())}</text>${text}
<text x="28" y="${H - 28}" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.4" fill="#9C9C92">${esc(a.date.toUpperCase())}</text><g class="nu"><path d="M${W - 52} ${H - 32}h14m-5 -5l5 5l-5 5" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></g></g>`;
  return wrap(W, H, a.title, body, defs);
}

// Phone-width variants of the full-width cards (the bento tiles stay percentage-sized).
function heroMobile() {
  const W = 640;
  const H = 440;
  const g = glow([{ x: 420, y: 0, rx: 320, ry: 200, c: "#8B5CF6", a: 0.5 }, { x: 120, y: 0, rx: 240, ry: 160, c: "#22D3EE", a: 0.34 }, { x: 640, y: 40, rx: 200, ry: 180, c: ORANGE, a: 0.4 }]);
  let px = 32;
  let py = 332;
  const chips = PRODUCTS.map((p, i) => {
    const w = Math.round(p.name.length * 8.6 + 40);
    if (px + w > W - 32) { px = 32; py += 42; }
    const t = `<g ${dl("r", 0.5 + i * 0.05)}><rect x="${px}" y="${py}" width="${w}" height="32" rx="16" fill="#fff" fill-opacity=".07" stroke="#fff" stroke-opacity=".14"/><circle cx="${px + 17}" cy="${py + 16}" r="5" fill="${p.fill}"/><text x="${px + 30}" y="${py + 21}" font-family="${SANS}" font-weight="600" font-size="13.5" fill="#F4F4F1">${esc(p.name)}</text></g>`;
    px += w + 8;
    return t;
  }).join("");
  const defs = `${g.defs}<clipPath id="mc"><rect width="${W}" height="${H}" rx="24"/></clipPath><clipPath id="mav"><circle cx="64" cy="64" r="25"/></clipPath><linearGradient id="mbw" gradientUnits="userSpaceOnUse" x1="32" y1="0" x2="300" y2="0"><stop offset="0" stop-color="#F4F4F1"/><stop offset=".3" stop-color="#F4F4F1"/><stop offset=".42" stop-color="#FF7A1A"/><stop offset=".62" stop-color="#FFD21F"/><stop offset=".82" stop-color="#F43F8E"/><stop offset="1" stop-color="#A855F7"/></linearGradient><linearGradient id="mrg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7A1A"/><stop offset=".5" stop-color="#F43F8E"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient>`;
  const body = `<g transform="translate(8,8)"><g clip-path="url(#mc)"><rect width="${W}" height="${H}" fill="${INK}"/>${g.body}
<circle cx="64" cy="64" r="30" fill="none" stroke="url(#mrg)" stroke-width="3"/><image href="${og("avatar")}" x="39" y="39" width="50" height="50" clip-path="url(#mav)" preserveAspectRatio="xMidYMid slice"/>
<text x="106" y="58" font-family="${MONO}" font-weight="500" font-size="13" letter-spacing="3" fill="url(#mrg)">GAGAN DEEP SINGH</text><text x="106" y="80" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="2" fill="#B8B8AE">GLINR STUDIOS / OPEN SOURCE</text>
${bigMark({ x: 30, y: 186, size: 92, ls: -5.5, top: 118, bottom: 188, sweepW: 100 })}
<text ${dl("r", 0.45)} x="32" y="246" font-family="${SANS}" font-weight="600" font-size="28" letter-spacing="-.5" fill="url(#mbw)">Building What Matters.</text>
<text ${dl("r", 0.5)} x="32" y="282" font-family="${SANS}" font-weight="500" font-size="17" fill="#C9C9BF">Developer infrastructure in public.</text><text ${dl("r", 0.52)} x="32" y="306" font-family="${SANS}" font-weight="500" font-size="17" fill="#C9C9BF">Next up: <tspan fill="#FACC15" font-weight="700">robotics</tspan>.</text>
${chips}</g></g>`;
  return wrap(W + 16, H + 16, "Gagan Deep Singh, founder of GLINR Studios. Building what matters. Next up robotics.", body, defs);
}
function numbersMobile() {
  const W = 640;
  const H = 260;
  const body = `<g transform="translate(8,8)"><rect width="${W}" height="${H}" rx="22" fill="#14140F"/><line x1="${W / 2}" y1="26" x2="${W / 2}" y2="${H - 26}" stroke="#fff" stroke-opacity=".1"/><line x1="26" y1="${H / 2}" x2="${W - 26}" y2="${H / 2}" stroke="#fff" stroke-opacity=".1"/>${COLS.map(([label, val, c], i) => { const x = (i % 2 ? W / 2 : 0) + 32; const y = i < 2 ? 0 : H / 2; return `<rect x="${x}" y="${y + 26}" width="24" height="4" rx="2" fill="${c}"/><text x="${x}" y="${y + 56}" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.6" fill="#9C9C92">${label}</text><text x="${x}" y="${y + 104}" font-family="${SANS}" font-weight="600" font-size="44" letter-spacing="-1.5" fill="${c}">${esc(val())}</text>`; }).join("")}</g>`;
  return wrap(W + 16, H + 16, `GitHub stars ${stats.stars}, npm downloads per month ${stats.month}, ${stats.packages} packages, CDN hits ${stats.cdn}`, body);
}

// Tool tiles for the Stack section: one small dark tile per tool, logo from theSVG (vendored in ./tools).
const TOOL_NAMES = { typescript: "TypeScript", javascript: "JavaScript", go: "Go", rust: "Rust", swift: "Swift", python: "Python", java: "Java", kotlin: "Kotlin", react: "React", nextjs: "Next.js", nodejs: "Node.js", tailwindcss: "Tailwind CSS", "spring-boot": "Spring Boot", vue: "Vue", svelte: "Svelte", postgresql: "PostgreSQL", redis: "Redis", sqlite: "SQLite", neon: "Neon", mongodb: "MongoDB", docker: "Docker", kubernetes: "Kubernetes", aws: "AWS", cloudflare: "Cloudflare", vercel: "Vercel", linux: "Linux", nginx: "NGINX", terraform: "Terraform", git: "Git", github: "GitHub", figma: "Figma", "visual-studio-code": "VS Code", "claude-code": "Claude Code", graphql: "GraphQL", stripe: "Stripe" };
function toolTile(slug) {
  const raw = readFileSync(new URL(`./tools/${slug}.svg`, import.meta.url), "utf8");
  const head = raw.match(/<svg[^>]*>/)[0];
  const vb = head.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
  const rootAttrs = head.replace(/^<svg/, "").replace(/>$/, "").replace(/\s(xmlns|width|height|viewBox|version)(:\w+)?="[^"]*"/g, "");
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title>[^<]*<\/title>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const body = `<rect x=".5" y=".5" width="39" height="39" rx="11" fill="#14140F" stroke="#fff" stroke-opacity=".1"/><svg x="8" y="8" width="24" height="24" viewBox="${vb}"${rootAttrs}>${inner.replace(/currentColor/g, "#F4F4F1")}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="40" height="40" viewBox="0 0 40 40" role="img" aria-label="${esc(TOOL_NAMES[slug] ?? slug)}"><title>${esc(TOOL_NAMES[slug] ?? slug)}</title>${body}</svg>`;
}

// thesvg UI icons (outline look, via the theSVG CLI), vendored in ./ui and tinted per use.
const uiIcon = (name, x, y, size, color) => {
  const raw = readFileSync(new URL(`./ui/ui-${name}.svg`, import.meta.url), "utf8");
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" overflow="visible" color="${color}" style="color:${color}">${inner.replace(/currentColor/g, color)}</svg>`;
};
// Brand files embedded as small nested SVGs; the site and Levelrail marks are tinted, the rest keep their own colours.
const embedBrand = (file, x, y, size) => {
  const raw = readFileSync(new URL(`./brands/${file}.svg`, import.meta.url), "utf8");
  const head = raw.match(/<svg[^>]*>/)[0];
  const vb = head.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
  const attrs = head.replace(/^<svg/, "").replace(/>$/, "").replace(/\s(xmlns|width|height|viewBox|version|preserveAspectRatio)(:\w+)?="[^"]*"/g, "");
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title>[^<]*<\/title>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${vb}"${attrs}>${inner}</svg>`;
};
const LINKS = [
  { id: "site", label: "thegdsks.com", brand: "site", tint: "#FF7A1A", c: "#FF7A1A" },
  { id: "levelrail", label: "levelrail.com/blog", brand: "levelrail", tint: "#8B5CF6", c: "#8B5CF6" },
  { id: "dev", label: "dev.to/thegdsks", brand: "dev", c: "#F4F4F1" },
  { id: "linkedin", label: "linkedin.com/in/gdsks", brand: "linkedin", c: "#38BDF8" },
  { id: "npm", label: "npm: gdsks", brand: "npm", c: "#F43F5E" },
  { id: "discord", label: "discord", brand: "discord", c: "#818CF8" },
];
function linkChip(l, i) {
  const w = Math.ceil(l.label.length * 7.5 + 64);
  const H = 36;
  const mark = l.tint ? logoMark(l.brand === "site" ? "glinr" : l.brand, 11, 9, 18, l.tint) : embedBrand(l.brand, 11, 9, 18);
  const body = `<g ${dl("r", 0.1 + i * 0.05)}><rect x=".5" y=".5" width="${w - 1}" height="${H - 1}" rx="18" fill="#14140F" stroke="#fff" stroke-opacity=".12"/>${mark}<text x="36" y="23" font-family="${MONO}" font-weight="500" font-size="12.5" fill="#F4F4F1">${esc(l.label)}</text><path d="M${w - 22} 22 l7 -7 m-5 0 h5 v5" fill="none" stroke="${l.c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  return wrap(w, H, l.label, body, "", MONO_CSS);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/hero.svg`, hero());
writeFileSync(`${OUT}/numbers.svg`, strip());
writeFileSync(`${OUT}/hero-mobile.svg`, heroMobile());
writeFileSync(`${OUT}/numbers-mobile.svg`, numbersMobile());
writeFileSync(`${OUT}/footer.svg`, footer());
SECTIONS.forEach(([id, eyebrow, title, c]) => writeFileSync(`${OUT}/header-${id}.svg`, header(eyebrow, title, c)));
writeFileSync(`${OUT}/graph.svg`, graph());
writeFileSync(`${OUT}/graph-mobile.svg`, graph(640, 26));
const LAYOUT = [
  ["levelrail", 587, true], ["thesvg", 293, false],
  ["theauth", 293, false], ["profclaw", 587, true],
  ["askverdict", 440, false], ["stacklit", 440, false],
];
LAYOUT.forEach(([id, w, wide], i) => writeFileSync(`${OUT}/tile-${id}.svg`, tile(PRODUCTS.find((p) => p.id === id), w, wide, i % 2)));
try {
  JSON.parse(readFileSync(new URL("./releases.json", import.meta.url), "utf8")).slice(0, 6).forEach((r, i) => writeFileSync(`${OUT}/release-${i}.svg`, releaseCard(r, i)));
} catch {
  // no releases.json yet
}
try {
  const arts = JSON.parse(readFileSync(new URL("./articles.json", import.meta.url), "utf8")).slice(0, 3);
  await Promise.all(arts.map((a, i) => fetchThumb(a, i)));
  arts.forEach((a, i) => writeFileSync(`${OUT}/writing-${i}.svg`, writingCard(a, i)));
} catch {
  // no articles.json yet
}
const TOOL_GROUPS = JSON.parse(readFileSync(new URL("./tools.json", import.meta.url), "utf8"));
Object.values(TOOL_GROUPS).flat().forEach((slug) => writeFileSync(`${OUT}/tool-${slug}.svg`, toolTile(slug)));
LINKS.forEach((l, i) => writeFileSync(`${OUT}/link-${l.id}.svg`, linkChip(l, i)));
console.log(`wrote studio cards to ${OUT}`);
