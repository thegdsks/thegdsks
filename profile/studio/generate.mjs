// Studio-floor profile cards: dark hero with a product orbit, number strip and a colour-blocked product bento.
// Usage: node profile/studio/generate.mjs [outDir]   (STATIC=1 renders the end state for screenshots)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

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
.sh{animation:sheen 5.5s ease-in-out infinite}
.pl{animation:pulse 1.8s ease-in-out infinite}
.nu{animation:nudge 1.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}${process.env.STATIC === "1" ? "*{animation:none!important}.sh{display:none}" : ""}`;
const dl = (c, d) => `class="${c}" style="animation-delay:${d}s"`;
const wrap = (w, h, alt, body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}"><defs><style>${FONT_CSS}${ANIM}text{font-kerning:normal}</style>${defs}</defs>${body}</svg>`;

// Real brand logos (mono, from theSVG via its CLI), vendored in ../paper/logos and tinted per use.
const logo = (id) => {
  const raw = readFileSync(new URL(`../paper/logos/${id}.svg`, import.meta.url), "utf8");
  const vb = raw.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
  const head = raw.split(">")[0];
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title>[^<]*<\/title>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  return { vb, inner, stroked: /stroke="currentColor"/.test(head), noFill: /fill="none"/.test(head) };
};
const logoMark = (id, x, y, size, color) => {
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
<circle cx="${cx}" cy="${cy}" r="48" fill="url(#core)"/>
<circle cx="${cx}" cy="${cy}" r="48" fill="none" stroke="${ORANGE}" stroke-width="2"><animate attributeName="r" values="48;82" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="3s" repeatCount="indefinite"/></circle>
<svg x="${cx - 26}" y="${cy - 26}" width="52" height="52" viewBox="${GLINR.vb}" fill="#fff"><g>${GLINR.inner}</g></svg>
${nodeSvg}
<g ${dl("r", 0.05)}><circle cx="92" cy="62" r="30" fill="none" stroke="url(#rg)" stroke-width="3"/><image href="${og("avatar")}" x="67" y="37" width="50" height="50" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/></g>
<text ${dl("r", 0.1)} x="134" y="56" font-family="${MONO}" font-weight="500" font-size="14" letter-spacing="3.6" fill="url(#rg)">GDS K S</text>
<text ${dl("r", 0.12)} x="134" y="78" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="2.4" fill="#B8B8AE">GLINR STUDIOS  /  OPEN SOURCE</text>
<text ${dl("r", 0.2)} x="64" y="168" font-family="${SANS}" font-weight="800" font-size="92" letter-spacing="-3.5" fill="url(#nm)">Gagan Deep</text>
<text ${dl("r", 0.32)} x="64" y="254" font-family="${SANS}" font-weight="800" font-size="92" letter-spacing="-3.5" fill="${ORANGE}">Singh</text>
<text ${dl("r", 0.5)} x="64" y="304" font-family="${SANS}" font-weight="800" font-size="30" letter-spacing="-0.8" fill="url(#bw)">Building What Matters.</text>
<text ${dl("r", 0.58)} x="64" y="336" font-family="${SANS}" font-weight="500" font-size="19" fill="#C9C9BF">Developer infrastructure in public. Next up: <tspan fill="#FACC15" font-weight="700">robotics</tspan>.</text>
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
  const body = `<defs><clipPath id="sc"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs><g clip-path="url(#sc)"><rect width="${W}" height="${H}" fill="#14140F"/>${COLS.map(([label, val, c], i) => {
    const x = 12 + i * cw + 40;
    return `${i ? `<line x1="${12 + i * cw}" y1="34" x2="${12 + i * cw}" y2="116" stroke="#fff" stroke-opacity=".1"/>` : ""}<rect ${dl("r", 0.1 + i * 0.1)} x="${x}" y="38" width="28" height="4" rx="2" fill="${c}"/><text ${dl("r", 0.15 + i * 0.1)} x="${x}" y="68" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="#9C9C92">${label}</text><text ${dl("r", 0.2 + i * 0.1)} x="${x}" y="118" font-family="${SANS}" font-weight="800" font-size="52" letter-spacing="-1.8" fill="${c}">${esc(val())}</text>`;
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
  const body = `<g ${dl("t", 0.08 + i * 0.1)}><g clip-path="url(#c${id})"><rect x="${x0}" y="6" width="${cw}" height="${ch}" fill="url(#d${id})"/><rect x="${x0}" y="6" width="${cw}" height="${ch}" fill="url(#h${id})"/>
<circle cx="${x0 + cw - 24}" cy="${H - 18}" r="130" fill="none" stroke="${p.fg}" stroke-opacity=".16" stroke-width="1.5"/><circle cx="${x0 + cw - 24}" cy="${H - 18}" r="86" fill="none" stroke="${p.fg}" stroke-opacity=".16" stroke-width="1.5"/>
<image href="${og(p.id)}" x="${x0}" y="6" width="${cw}" height="${ch}" preserveAspectRatio="xMidYMid slice" mask="url(#k${id})" filter="url(#b${id})" opacity=".34"/>
<g transform="${wide ? `translate(${x0 + cw - 26 - 240},168)` : `translate(${x0 + cw - 26 - 240 * Math.min(1, (cw - 52) / 240)},184) scale(${Math.min(1, (cw - 52) / 240).toFixed(3)})`}">${illus(p.id, p.fg, p.fill2)}</g>
<rect x="${x0 + 26}" y="30" width="44" height="44" rx="12" fill="${p.fg}" fill-opacity=".14"/>${logoMark(p.id, x0 + 36, 40, 24, p.fg)}
<text x="${x0 + cw - 26}" y="56" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.8" fill="${p.fg}" fill-opacity=".75">${p.tag}</text>
<text x="${x0 + 26}" y="122" font-family="${SANS}" font-weight="800" font-size="${wide ? 40 : 34}" letter-spacing="-1.2" fill="${p.fg}">${esc(p.name)}</text>
<text x="${x0 + 26}" y="152" font-family="${SANS}" font-weight="500" font-size="${wide ? 14.5 : 12.5}" fill="${p.fg}" fill-opacity=".86">${esc(p.desc[0])}</text>
<text x="${x0 + 26}" y="172" font-family="${SANS}" font-weight="500" font-size="${wide ? 14.5 : 12.5}" fill="${p.fg}" fill-opacity=".86">${esc(p.desc[1])}</text>
<text x="${x0 + 26}" y="${H - 30}" font-family="${MONO}" font-weight="500" font-size="11.5" letter-spacing="1.2" fill="${p.fg}">${meta}</text>
<g class="nu"><circle cx="${x0 + cw - 40}" cy="${H - 34}" r="16" fill="${p.fg}"/><path d="M${x0 + cw - 47} ${H - 34}h12m-5 -5l5 5l-5 5" fill="none" stroke="${p.fill2}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
<rect class="sh" x="${x0}" y="6" width="90" height="${ch}" fill="url(#s${id})"/></g></g>`;
  return wrap(w, H, `${p.name}: ${p.desc.join(" ")}`, body, defs);
}


// Contribution heatmap: colour runs across the year through the product palette, depth is opacity.
function graph(W = 1200, n = 53) {
  const cal = JSON.parse(readFileSync(new URL("../paper/contributions.json", import.meta.url), "utf8"));
  const weeks = cal.weeks.slice(-n);
  const all = weeks.flatMap((w) => w.contributionDays);
  const nz = all.map((d) => d.contributionCount).filter((n) => n > 0).sort((a, b) => a - b);
  const q = [0.25, 0.5, 0.75].map((f) => nz[Math.floor(nz.length * f)] ?? 1);
  const lvl = (n) => (n === 0 ? 0 : 1 + q.filter((v) => n > v).length);
  const alpha = [0.07, 0.38, 0.6, 0.82, 1];
  const stops = ["#8B5CF6", "#06B6D4", "#10B981", "#FFD21F", "#FF7A1A", "#F43F8E"];
  const mix = (a, b, t) => `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("")}`;
  const colorAt = (f) => { const x = f * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(x)); return mix(stops[i], stops[i + 1], x - i); };
  const gap = 4;
  const left = 40;
  const cell = (W - 2 * left - gap * (weeks.length - 1)) / weeks.length;
  const top = 112;
  const H = top + 7 * (cell + gap) + 52;
  const total = all.reduce((a, d) => a + d.contributionCount, 0);
  const active = all.filter((d) => d.contributionCount > 0).length;
  const best = Math.max(...all.map((d) => d.contributionCount));
  const cells = weeks
    .map((w, i) => w.contributionDays.map((d, j) => `<rect ${dl("p", (0.2 + i * 0.016 + j * 0.01).toFixed(2))} x="${(left + i * (cell + gap)).toFixed(1)}" y="${(top + j * (cell + gap)).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="3" fill="${colorAt(i / (weeks.length - 1))}" fill-opacity="${alpha[lvl(d.contributionCount)]}"/>`).join(""))
    .join("");
  const stat = (x, label, val, c) => `<text x="${x}" y="40" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.6" fill="#9C9C92" text-anchor="end">${label}</text><text x="${x}" y="78" font-family="${SANS}" font-weight="800" font-size="34" letter-spacing="-1" fill="${c}" text-anchor="end">${val}</text>`;
  const body = `<defs><clipPath id="gc"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs><g clip-path="url(#gc)"><rect width="${W}" height="${H}" fill="#0B0B09"/>
<text x="${left}" y="40" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.6" fill="#9C9C92">CONTRIBUTIONS, LAST YEAR</text><text ${dl("r", 0.1)} x="${left}" y="78" font-family="${SANS}" font-weight="800" font-size="34" letter-spacing="-1" fill="#F4F4F1">${total.toLocaleString("en-US")}</text>
${stat(W - left - (W > 800 ? 340 : 170), "ACTIVE DAYS", active, "#22D3EE")}${stat(W - left, "BEST DAY", best, "#FF7A1A")}
${cells}</g>`;
  return wrap(W + 16, H + 16, `Contribution graph, ${total} contributions in the last year, ${active} active days`, `<g transform="translate(8,8)">${body}</g>`);
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
  const mark = hasLogo ? logoMark(r.product, 38, 42, 28, "#0B0B09") : `<text x="52" y="63" text-anchor="middle" font-family="${SANS}" font-weight="800" font-size="22" fill="#0B0B09">${esc(r.name[0].toUpperCase())}</text>`;
  const id = `r${i}`;
  const defs = `<clipPath id="c${id}"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20"/></clipPath><radialGradient id="g${id}" cx="0" cy=".5" r="1"><stop offset="0" stop-color="${c}" stop-opacity=".34"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const body = `<g ${dl("t", 0.1 + i * 0.07)}><g clip-path="url(#c${id})"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="#14140F"/><rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="url(#g${id})"/>
<rect x="6" y="${H - 10}" width="${W - 12}" height="4" fill="${c}"/>
<rect x="28" y="28" width="48" height="48" rx="14" fill="${c}"/>${mark}
<text x="92" y="48" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.8" fill="#9C9C92">${esc(r.name.toUpperCase())}</text>
<text x="92" y="86" font-family="${SANS}" font-weight="800" font-size="38" letter-spacing="-1.4" fill="#F4F4F1">${esc(r.version)}</text>
<text x="28" y="${H - 34}" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.2" fill="#C9C9BF">${esc(r.date.toUpperCase())}${i === 0 ? "  \u00b7  LATEST" : ""}</text>
${isNew ? `<rect x="${W - 86}" y="30" width="56" height="22" rx="11" fill="${c}"/><circle class="pl" cx="${W - 73}" cy="41" r="3.5" fill="#0B0B09"/><text x="${W - 65}" y="45" font-family="${MONO}" font-weight="500" font-size="10" letter-spacing="1.2" fill="#0B0B09">NEW</text>` : ""}
<g class="nu"><path d="M${W - 52} ${H - 38}h14m-5 -5l5 5l-5 5" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></g></g>`;
  return wrap(W, H, `${r.name} ${r.version}, released ${r.date}`, body, defs);
}

// Section headers, footer, writing cards and phone-width variants.
const SECTIONS = [["work", "01 / PRODUCTS", "Selected work", "#8B5CF6"], ["releases", "02 / SHIPPING", "Recent releases", "#FF7A1A"], ["writing", "03 / WRITING", "Latest writing", "#06B6D4"], ["now", "04 / NOW", "What I am on", "#F43F8E"], ["stack", "05 / STACK", "Tools I use", "#10B981"]];
function header(eyebrow, title, c) {
  const W = 1200;
  const H = 92;
  const body = `<g transform="translate(8,8)"><defs><clipPath id="hh"><rect width="${W}" height="${H}" rx="22"/></clipPath><linearGradient id="hl" x1="0" x2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><g clip-path="url(#hh)"><rect width="${W}" height="${H}" fill="#0B0B09"/>
<rect ${dl("d", 0.1)} x="0" y="${H - 4}" width="${W}" height="4" fill="url(#hl)"/>
<text ${dl("r", 0.05)} x="36" y="36" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="2.2" fill="${c}">${eyebrow}</text>
<text ${dl("r", 0.15)} x="36" y="72" font-family="${SANS}" font-weight="800" font-size="32" letter-spacing="-1" fill="#F4F4F1">${esc(title)}</text>
<circle cx="${W - 44}" cy="46" r="8" fill="${c}"/><circle class="pl" cx="${W - 44}" cy="46" r="8" fill="${c}"/></g></g>`;
  return wrap(W + 16, H + 16, title, body);
}
function footer() {
  const W = 1200;
  const body = `<g transform="translate(8,8)"><rect width="${W}" height="64" rx="22" fill="#0B0B09"/><circle class="pl" cx="40" cy="32" r="5" fill="#34D399"/><circle cx="40" cy="32" r="5" fill="#34D399"/><text x="58" y="37" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="#9C9C92">BUILT BY HAND  /  REFRESHED DAILY BY CRON  /  LAST RUN ${stats.updated}</text><text x="${W - 36}" y="37" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="#FF7A1A">GLINR STUDIOS</text></g>`;
  return wrap(W + 16, 80, `Built by hand, refreshed daily. Last run ${stats.updated}`, body);
}
const WRITE_COLORS = ["#FF7A1A", "#8B5CF6", "#06B6D4"];
function writingCard(a, i) {
  const W = 400;
  const H = 210;
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
  const text = shown.map((l, j) => `<text x="28" y="${86 + j * 28}" font-family="${SANS}" font-weight="800" font-size="22" letter-spacing="-.4" fill="#F4F4F1">${esc(l)}</text>`).join("");
  const defs = `<clipPath id="wc"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20"/></clipPath><radialGradient id="wg" cx="1" cy="0" r="1"><stop offset="0" stop-color="${c}" stop-opacity=".4"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const body = `<g ${dl("t", 0.1 + i * 0.08)}><g clip-path="url(#wc)"><rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="#14140F"/><rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="url(#wg)"/><rect x="6" y="6" width="5" height="${H - 12}" fill="${c}"/>
<text x="28" y="44" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.8" fill="${c}">${esc(a.source.toUpperCase())}</text>${text}
<text x="28" y="${H - 28}" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.4" fill="#9C9C92">${esc(a.date.toUpperCase())}</text><g class="nu"><path d="M${W - 52} ${H - 32}h14m-5 -5l5 5l-5 5" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></g></g>`;
  return wrap(W, H, a.title, body, defs);
}

// Phone-width variants of the full-width cards (the bento tiles stay percentage-sized).
function heroMobile() {
  const W = 640;
  const H = 520;
  const g = glow([{ x: 420, y: 0, rx: 320, ry: 200, c: "#8B5CF6", a: 0.5 }, { x: 120, y: 0, rx: 240, ry: 160, c: "#22D3EE", a: 0.34 }, { x: 640, y: 40, rx: 200, ry: 180, c: ORANGE, a: 0.4 }]);
  let px = 32;
  let py = 424;
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
<text x="106" y="58" font-family="${MONO}" font-weight="500" font-size="14" letter-spacing="3.6" fill="url(#mrg)">GDS K S</text><text x="106" y="80" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="2" fill="#B8B8AE">GLINR STUDIOS / OPEN SOURCE</text>
<text ${dl("r", 0.2)} x="30" y="170" font-family="${SANS}" font-weight="800" font-size="72" letter-spacing="-3" fill="#F4F4F1">Gagan Deep</text><text ${dl("r", 0.3)} x="30" y="240" font-family="${SANS}" font-weight="800" font-size="72" letter-spacing="-3" fill="${ORANGE}">Singh</text>
<text ${dl("r", 0.45)} x="32" y="300" font-family="${SANS}" font-weight="800" font-size="28" letter-spacing="-.6" fill="url(#mbw)">Building What Matters.</text>
<text ${dl("r", 0.5)} x="32" y="334" font-family="${SANS}" font-weight="500" font-size="17" fill="#C9C9BF">Developer infrastructure in public.</text><text ${dl("r", 0.52)} x="32" y="358" font-family="${SANS}" font-weight="500" font-size="17" fill="#C9C9BF">Next up: <tspan fill="#FACC15" font-weight="700">robotics</tspan>.</text>
${chips}</g></g>`;
  return wrap(W + 16, H + 16, "Gagan Deep Singh, founder of GLINR Studios. Building what matters. Next up robotics.", body, defs);
}
function numbersMobile() {
  const W = 640;
  const H = 260;
  const body = `<g transform="translate(8,8)"><rect width="${W}" height="${H}" rx="22" fill="#14140F"/><line x1="${W / 2}" y1="26" x2="${W / 2}" y2="${H - 26}" stroke="#fff" stroke-opacity=".1"/><line x1="26" y1="${H / 2}" x2="${W - 26}" y2="${H / 2}" stroke="#fff" stroke-opacity=".1"/>${COLS.map(([label, val, c], i) => { const x = (i % 2 ? W / 2 : 0) + 32; const y = i < 2 ? 0 : H / 2; return `<rect x="${x}" y="${y + 26}" width="24" height="4" rx="2" fill="${c}"/><text x="${x}" y="${y + 56}" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.6" fill="#9C9C92">${label}</text><text x="${x}" y="${y + 104}" font-family="${SANS}" font-weight="800" font-size="44" letter-spacing="-1.5" fill="${c}">${esc(val())}</text>`; }).join("")}</g>`;
  return wrap(W + 16, H + 16, `GitHub stars ${stats.stars}, npm downloads per month ${stats.month}, ${stats.packages} packages, CDN hits ${stats.cdn}`, body);
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
  JSON.parse(readFileSync(new URL("./articles.json", import.meta.url), "utf8")).slice(0, 3).forEach((a, i) => writeFileSync(`${OUT}/writing-${i}.svg`, writingCard(a, i)));
} catch {
  // no articles.json yet
}
console.log(`wrote studio cards to ${OUT}`);
