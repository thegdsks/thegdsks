// Paper-style profile cards: hero and stat strip, light and ink variants.
// Usage: node profile/paper/generate.mjs [outDir]   (reads profile/assets/stats.json)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = process.argv[2] ?? "profile/paper/out";
const stats = JSON.parse(readFileSync(new URL("../assets/stats.json", import.meta.url), "utf8"));
const font = (f) => readFileSync(new URL(`./fonts/${f}`, import.meta.url)).toString("base64");

const FACES = {
  serif: `@font-face{font-family:'F';src:url(data:font/woff;base64,${font("fraunces-500.woff")}) format('woff');font-weight:500}`,
  serifI: `@font-face{font-family:'F';src:url(data:font/woff;base64,${font("fraunces-400i.woff")}) format('woff');font-weight:400;font-style:italic}`,
  mono: `@font-face{font-family:'M';src:url(data:font/woff;base64,${font("geist-mono-500.woff")}) format('woff');font-weight:500}`,
};
const SERIF = "F, Georgia, 'Times New Roman', serif";
const MONO = "M, ui-monospace, Menlo, monospace";

const THEMES = {
  paper: { bg: "#F6F3EC", ink: "#141414", sub: "#5C5850", rule: "#D9D4C7", blue: "#1F3FD6" },
  ink: { bg: "#111110", ink: "#F2EFE7", sub: "#A29E93", rule: "#2E2D2A", blue: "#6C86FF" },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e5 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

const wrap = (w, h, t, faces, alt, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}"><style>${faces.join("")}text{font-kerning:normal}</style><rect width="${w}" height="${h}" fill="${t.bg}"/>${body}</svg>`;

const LINKS = ["thegdsks.com", "levelrail.com/blog", "dev.to/thegdsks", "linkedin.com/in/gdsks", "npm: gdsks", "discord"];

function hero(t) {
  const W = 1200;
  const H = 352;
  let x = 64;
  const links = LINKS.map((l) => {
    const s = `<text x="${x}" y="326" font-family="${MONO}" font-weight="500" font-size="14" fill="${t.ink}">${esc(l)}</text>`;
    x += l.length * 8.4 + 34;
    return s;
  }).join("");
  const body = `
<text x="64" y="72" font-family="${MONO}" font-weight="500" font-size="13" letter-spacing="2.2" fill="${t.sub}">GLINR STUDIOS  /  OPEN SOURCE</text>
<text x="64" y="176" font-family="${SERIF}" font-weight="500" font-size="96" letter-spacing="-2" fill="${t.ink}">Gagan Deep Singh</text>
<text x="64" y="232" font-family="${SERIF}" font-style="italic" font-size="30" fill="${t.sub}">Software architect and open source maintainer, building developer</text>
<text x="64" y="270" font-family="${SERIF}" font-style="italic" font-size="30" fill="${t.sub}">infrastructure in public. Next up: <tspan fill="${t.blue}">robotics</tspan>.</text>
<line x1="64" y1="294" x2="${W - 64}" y2="294" stroke="${t.rule}" stroke-width="1"/>
${links}
<circle cx="${W - 232}" cy="321" r="4.5" fill="${t.blue}"/>
<circle cx="${W - 232}" cy="321" r="4.5" fill="none" stroke="${t.blue}" stroke-width="1.5"><animate attributeName="r" values="4.5;13" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="2.6s" repeatCount="indefinite"/></circle>
<text x="${W - 216}" y="326" font-family="${MONO}" font-weight="500" font-size="14" fill="${t.sub}">now: Levelrail</text>`;
  return wrap(W, H, t, [FACES.serif, FACES.serifI, FACES.mono], "Gagan Deep Singh, founder of GLINR Studios, software architect and open source maintainer, next up robotics", body);
}

function strip(t) {
  const W = 1200;
  const H = 168;
  const cols = [
    ["GITHUB STARS", fmt(stats.stars) + "+"],
    ["NPM DOWNLOADS / MO", fmt(stats.month) + "+"],
    ["PACKAGES", String(stats.packages) + "+"],
    ["CDN HITS / MO", fmt(stats.cdn) + "+"],
  ];
  const cw = (W - 128) / 4;
  const body =
    `<line x1="64" y1="28" x2="${W - 64}" y2="28" stroke="${t.rule}"/>` +
    cols
      .map(([label, value], i) => {
        const cx = 64 + i * cw + (i ? 28 : 0);
        const div = i ? `<line x1="${64 + i * cw}" y1="52" x2="${64 + i * cw}" y2="140" stroke="${t.rule}"/>` : "";
        return `${div}<text x="${cx}" y="62" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="${t.sub}">${label}</text><text x="${cx}" y="124" font-family="${SERIF}" font-weight="500" font-size="56" letter-spacing="-1.2" fill="${i === 1 ? t.blue : t.ink}">${esc(value)}</text>`;
      })
      .join("") +
    `<line x1="64" y1="152" x2="${W - 64}" y2="152" stroke="${t.rule}"/>`;
  return wrap(W, H, t, [FACES.serif, FACES.mono], `GitHub stars ${stats.stars}, npm downloads per month ${stats.month}, ${stats.packages} packages, CDN hits per month ${stats.cdn}`, body);
}

mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(`${OUT}/hero-${name}.svg`, hero(t));
  writeFileSync(`${OUT}/stats-${name}.svg`, strip(t));
}
console.log(`wrote paper cards to ${OUT}`);
