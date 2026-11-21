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


const cal = JSON.parse(readFileSync(new URL("./contributions.json", import.meta.url), "utf8"));
const RAMP = {
  paper: ["#E9E5DA", "#CBD2F4", "#94A5EC", "#5069E0", "#1F3FD6"],
  ink: ["#1E1D1B", "#1B2252", "#27389A", "#4660DC", "#8FA3FF"],
};
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Heatmap of the last `weeks` weeks: one blue ramp, no other colours.
function graph(t, name, W, weeks) {
  const ws = cal.weeks.slice(-weeks);
    const all = ws.flatMap((w) => w.contributionDays);
  const nz = all.map((d) => d.contributionCount).filter((n) => n > 0).sort((a, b) => a - b);
  const q = [0.25, 0.5, 0.75].map((f) => nz[Math.floor(nz.length * f)] ?? 1);
  const lvl = (n) => (n === 0 ? 0 : 1 + q.filter((v) => n > v).length);
  const total = all.reduce((a, d) => a + d.contributionCount, 0);
  const gap = 3;
  const cell = (W - 128 - gap * (ws.length - 1)) / ws.length;
  const H = 76 + 7 * (cell + gap) + 52;
  const ramp = RAMP[name];
  const rects = ws
    .map((w, i) => w.contributionDays.map((d, j) => `<rect x="${(64 + i * (cell + gap)).toFixed(1)}" y="${(76 + j * (cell + gap)).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="2" fill="${ramp[lvl(d.contributionCount)]}"/>`).join(""))
    .join("");
  const legend = ramp.map((c, i) => `<rect x="${W - 64 - 5 * 16 + i * 16}" y="${H - 28}" width="12" height="12" rx="2" fill="${c}"/>`).join("");
  const body = `<text x="64" y="44" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="${t.sub}">CONTRIBUTIONS, LAST ${weeks >= 52 ? "YEAR" : weeks + " WEEKS"}</text><text x="${W - 64}" y="44" text-anchor="end" font-family="${SERIF}" font-weight="500" font-size="26" fill="${t.blue}">${total.toLocaleString("en-US")}</text>${rects}<text x="64" y="${H - 17}" font-family="${MONO}" font-weight="500" font-size="11" fill="${t.sub}">updated ${stats.updated}</text><text x="${W - 64 - 5 * 16 - 10}" y="${H - 17}" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="11" fill="${t.sub}">less</text><text x="${W - 64 + 0}" y="${H - 17}" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="11" fill="${t.sub}" opacity="0">.</text>${legend}`;
  return wrap(W, H, t, [FACES.serif, FACES.mono], `Contribution graph for the last ${weeks} weeks, ${total} contributions, in blue`, body);
}

// One thin bar per month; the best month is blue, the rest ink.
function months(t, W, count) {
  const byMonth = new Map();
  for (const w of cal.weeks) for (const d of w.contributionDays) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.contributionCount);
  const list = [...byMonth].slice(-count);
  const max = Math.max(...list.map(([, n]) => n));
  const H = 250;
  const slot = (W - 128) / list.length;
  const bw = Math.min(28, slot * 0.4);
  const bars = list
    .map(([m, n], i) => {
      const h = Math.max(2, (n / max) * 120);
      const cx = 64 + i * slot + slot / 2;
      const best = n === max;
      return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(190 - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${best ? t.blue : t.ink}"/><text x="${cx.toFixed(1)}" y="214" text-anchor="middle" font-family="${MONO}" font-weight="500" font-size="11" fill="${t.sub}">${MONTHS[Number(m.slice(5)) - 1]}</text>${best ? `<text x="${cx.toFixed(1)}" y="${(190 - h - 10).toFixed(1)}" text-anchor="middle" font-family="${SERIF}" font-weight="500" font-size="22" fill="${t.blue}">${n.toLocaleString("en-US")}</text>` : ""}`;
    })
    .join("");
  const body = `<text x="64" y="44" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="${t.sub}">PER MONTH</text><line x1="64" y1="190" x2="${W - 64}" y2="190" stroke="${t.rule}"/>${bars}<line x1="64" y1="232" x2="${W - 64}" y2="232" stroke="${t.rule}"/>`;
  return wrap(W, H, t, [FACES.serif, FACES.mono], `Contributions per month, last ${count} months`, body);
}

const PROJECTS = [
  ["levelrail", "Levelrail", "DEPLOY", ["Self-hosted deploys. Git push, HTTPS,", "logs and rollback, no Kubernetes."]],
  ["thesvg", "theSVG", "OPEN SOURCE", ["7,600+ brand logos, 372 UI icons.", "React, Vue, CDN, CLI and MCP."]],
  ["theauth", "theAuth", "AUTH", ["Auth for AI agents and humans.", "MCP OAuth 2.1, delegation, audit."]],
  ["profclaw", "profClaw", "AGENTS", ["Self-hosted AI agent engine.", "22 channels, 65 tools, any LLM."]],
  ["askverdict", "AskVerdict", "AI", ["Multi-agent AI debate engine.", "Many models, one verdict."]],
  ["stacklit", "Stacklit", "DEV TOOL", ["Codebase context for AI agents", "in about 250 tokens."]],
];

function projectCard(t, p) {
  const [id, name, tag, desc] = p;
  const s = stats.projects.find((x) => x.id === id);
  const meta = [s?.stars ? `${fmt(s.stars)} stars` : "", s?.month ? `${fmt(s.month)} / mo` : ""].filter(Boolean).join("  \u00b7  ");
  const body = `<rect x="0.5" y="0.5" width="383" height="199" fill="none" stroke="${t.rule}"/><text x="28" y="42" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.8" fill="${t.sub}">${tag}</text><text x="28" y="92" font-family="${SERIF}" font-weight="500" font-size="40" letter-spacing="-0.8" fill="${t.ink}">${esc(name)}</text><text x="28" y="124" font-family="${SERIF}" font-style="italic" font-size="16" fill="${t.sub}">${esc(desc[0])}</text><text x="28" y="146" font-family="${SERIF}" font-style="italic" font-size="16" fill="${t.sub}">${esc(desc[1])}</text><line x1="28" y1="162" x2="356" y2="162" stroke="${t.rule}"/><text x="28" y="184" font-family="${MONO}" font-weight="500" font-size="12" fill="${t.ink}">${esc(meta)}</text><text x="356" y="184" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="14" fill="${t.blue}">&#8594;</text>`;
  return wrap(384, 200, t, [FACES.serif, FACES.serifI, FACES.mono], `${name}: ${desc.join(" ")}`, body);
}

function heroMobile(t) {
  const W = 640;
  const H = 400;
  const body = `<text x="32" y="54" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="2" fill="${t.sub}">GLINR STUDIOS  /  OPEN SOURCE</text><text x="32" y="124" font-family="${SERIF}" font-weight="500" font-size="54" letter-spacing="-1.2" fill="${t.ink}">Gagan Deep Singh</text><text x="32" y="172" font-family="${SERIF}" font-style="italic" font-size="22" fill="${t.sub}">Software architect and open source</text><text x="32" y="202" font-family="${SERIF}" font-style="italic" font-size="22" fill="${t.sub}">maintainer, building developer</text><text x="32" y="232" font-family="${SERIF}" font-style="italic" font-size="22" fill="${t.sub}">infrastructure in public. Next up: <tspan fill="${t.blue}">robotics</tspan>.</text><line x1="32" y1="260" x2="${W - 32}" y2="260" stroke="${t.rule}"/><text x="32" y="292" font-family="${MONO}" font-weight="500" font-size="13" fill="${t.ink}">thegdsks.com \u00b7 levelrail.com/blog \u00b7 dev.to/thegdsks</text><text x="32" y="318" font-family="${MONO}" font-weight="500" font-size="13" fill="${t.ink}">linkedin.com/in/gdsks \u00b7 npm: gdsks \u00b7 discord</text><circle cx="36" cy="360" r="4.5" fill="${t.blue}"/><text x="52" y="365" font-family="${MONO}" font-weight="500" font-size="13" fill="${t.sub}">now: Levelrail</text>`;
  return wrap(W, H, t, [FACES.serif, FACES.serifI, FACES.mono], "Gagan Deep Singh, founder of GLINR Studios, software architect and open source maintainer, next up robotics", body);
}

function stripMobile(t) {
  const W = 640;
  const H = 280;
  const cols = [["GITHUB STARS", fmt(stats.stars) + "+"], ["NPM / MO", fmt(stats.month) + "+"], ["PACKAGES", stats.packages + "+"], ["CDN HITS / MO", fmt(stats.cdn) + "+"]];
  const body =
    `<line x1="32" y1="20" x2="${W - 32}" y2="20" stroke="${t.rule}"/><line x1="320" y1="40" x2="320" y2="244" stroke="${t.rule}"/><line x1="32" y1="140" x2="${W - 32}" y2="140" stroke="${t.rule}"/><line x1="32" y1="260" x2="${W - 32}" y2="260" stroke="${t.rule}"/>` +
    cols.map(([l, v], i) => { const x = i % 2 ? 352 : 32; const y = i < 2 ? 0 : 120; return `<text x="${x}" y="${y + 56}" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.6" fill="${t.sub}">${l}</text><text x="${x}" y="${y + 112}" font-family="${SERIF}" font-weight="500" font-size="52" letter-spacing="-1" fill="${i === 1 ? t.blue : t.ink}">${esc(v)}</text>`; }).join("");
  return wrap(W, H, t, [FACES.serif, FACES.mono], "Profile numbers", body);
}

mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(`${OUT}/hero-${name}.svg`, hero(t));
  writeFileSync(`${OUT}/stats-${name}.svg`, strip(t));
  writeFileSync(`${OUT}/hero-mobile-${name}.svg`, heroMobile(t));
  writeFileSync(`${OUT}/stats-mobile-${name}.svg`, stripMobile(t));
  writeFileSync(`${OUT}/graph-${name}.svg`, graph(t, name, 1200, 53));
  writeFileSync(`${OUT}/graph-mobile-${name}.svg`, graph(t, name, 640, 26));
  writeFileSync(`${OUT}/months-${name}.svg`, months(t, 1200, 12));
  writeFileSync(`${OUT}/months-mobile-${name}.svg`, months(t, 640, 6));
  for (const p of PROJECTS) writeFileSync(`${OUT}/card-${p[0]}-${name}.svg`, projectCard(t, p));
}
console.log(`wrote paper cards to ${OUT}`);
