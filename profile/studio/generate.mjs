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
  return { vb, inner, stroked: /stroke="currentColor"/.test(head) };
};
const logoMark = (id, x, y, size, color) => {
  const l = logo(id);
  const attrs = l.stroked ? `fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"` : `fill="${color}" color="${color}"`;
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
  const defs = `${g.defs}<linearGradient id="nm" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="900" y2="0"><stop offset="0" stop-color="#F4F4F1"/><stop offset=".45" stop-color="#F4F4F1"/><stop offset=".5" stop-color="${ORANGE}"/><stop offset=".55" stop-color="#F4F4F1"/><stop offset="1" stop-color="#F4F4F1"/><animateTransform attributeName="gradientTransform" type="translate" values="-900 0;900 0;900 0" keyTimes="0;.4;1" dur="8s" begin="1.4s" repeatCount="indefinite"/></linearGradient><clipPath id="hc"><rect width="${W}" height="${H}" rx="24"/></clipPath><radialGradient id="core"><stop offset="0" stop-color="#FFB27A"/><stop offset="1" stop-color="${ORANGE}"/></radialGradient>`;
  const body = `<g clip-path="url(#hc)"><rect width="${W}" height="${H}" fill="${INK}"/>${g.body}
<g ${dl("r", 0.1)}>${rings.map((r, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity="${0.22 - i * 0.04}" ${i === 1 ? 'stroke-dasharray="3 8"' : ""}/>`).join("")}</g>
<circle cx="${cx}" cy="${cy}" r="48" fill="url(#core)"/>
<circle cx="${cx}" cy="${cy}" r="48" fill="none" stroke="${ORANGE}" stroke-width="2"><animate attributeName="r" values="48;82" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="3s" repeatCount="indefinite"/></circle>
<svg x="${cx - 26}" y="${cy - 26}" width="52" height="52" viewBox="${GLINR.vb}" fill="#fff"><g>${GLINR.inner}</g></svg>
${nodeSvg}
<rect ${dl("r", 0.05)} x="64" y="62" width="9" height="9" rx="2" fill="${ORANGE}"/><rect class="pl" x="64" y="62" width="9" height="9" rx="2" fill="${ORANGE}"/>
<text ${dl("r", 0.1)} x="84" y="71" font-family="${MONO}" font-weight="500" font-size="13" letter-spacing="2.4" fill="#B8B8AE">GLINR STUDIOS  /  OPEN SOURCE</text>
<text ${dl("r", 0.2)} x="64" y="168" font-family="${SANS}" font-weight="800" font-size="92" letter-spacing="-3.5" fill="url(#nm)">Gagan Deep</text>
<text ${dl("r", 0.32)} x="64" y="254" font-family="${SANS}" font-weight="800" font-size="92" letter-spacing="-3.5" fill="${ORANGE}">Singh</text>
<text ${dl("r", 0.5)} x="64" y="306" font-family="${SANS}" font-weight="500" font-size="21" fill="#C9C9BF">Software architect building developer infrastructure in public.</text>
<text ${dl("r", 0.55)} x="64" y="334" font-family="${SANS}" font-weight="500" font-size="21" fill="#C9C9BF">Six products, millions of downloads. Next up: <tspan fill="#FACC15" font-weight="700">robotics</tspan>.</text>
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
  const meta = [s?.stars ? `${fmt(s.stars)} STARS` : "", s?.month ? `${fmt(s.month)} / MO` : ""].filter(Boolean).join("  \u00b7  ");
  const id = `${p.id}${w}`;
  const defs = `<clipPath id="c${id}"><rect x="${x0}" y="6" width="${cw}" height="${ch}" rx="22"/></clipPath><linearGradient id="s${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="d${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.fill}"/><stop offset="1" stop-color="${p.fill2}"/></linearGradient><radialGradient id="h${id}" cx=".15" cy="0" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
  const body = `<g ${dl("t", 0.08 + i * 0.1)}><g clip-path="url(#c${id})"><rect x="${x0}" y="6" width="${cw}" height="${ch}" fill="url(#d${id})"/><rect x="${x0}" y="6" width="${cw}" height="${ch}" fill="url(#h${id})"/>
<circle cx="${x0 + cw - 24}" cy="${H - 18}" r="130" fill="none" stroke="${p.fg}" stroke-opacity=".16" stroke-width="1.5"/><circle cx="${x0 + cw - 24}" cy="${H - 18}" r="86" fill="none" stroke="${p.fg}" stroke-opacity=".16" stroke-width="1.5"/>
<g opacity=".07">${logoMark(p.id, x0 + cw - 190, H - 210, 190, p.fg)}</g>
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

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/hero.svg`, hero());
writeFileSync(`${OUT}/numbers.svg`, strip());
const LAYOUT = [
  ["levelrail", 587, true], ["thesvg", 293, false],
  ["theauth", 293, false], ["profclaw", 587, true],
  ["askverdict", 440, false], ["stacklit", 440, false],
];
LAYOUT.forEach(([id, w, wide], i) => writeFileSync(`${OUT}/tile-${id}.svg`, tile(PRODUCTS.find((p) => p.id === id), w, wide, i % 2)));
console.log(`wrote studio cards to ${OUT}`);
