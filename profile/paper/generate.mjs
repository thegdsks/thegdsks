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

const ANIM = "@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes pop{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}@keyframes grow{from{transform:scaleY(0)}to{transform:none}}@keyframes draw{from{transform:scaleX(0)}to{transform:none}}.r{animation:rise .9s cubic-bezier(.2,.7,.2,1) both}.p{transform-box:fill-box;transform-origin:center;animation:pop .5s cubic-bezier(.2,.8,.3,1.3) both}.g{transform-box:fill-box;transform-origin:bottom;animation:grow 1s cubic-bezier(.2,.7,.2,1) both}.d{transform-box:fill-box;transform-origin:left;animation:draw 1.1s cubic-bezier(.2,.7,.2,1) both}@keyframes blink{50%{opacity:0}}.k{animation:blink 1.1s steps(1) infinite}@media (prefers-reduced-motion:reduce){*{animation:none!important}}" + (process.env.STATIC === "1" ? "*{animation:none!important}" : "");
const dl = (c, d) => `class="${c}" style="animation-delay:${d}s"`;
const wrap = (w, h, t, faces, alt, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(alt)}"><style>${faces.join("")}${ANIM}text{font-kerning:normal}</style><rect width="${w}" height="${h}" fill="${t.bg}"/>${body}</svg>`;

const LINKS = [
  ["site", "thegdsks.com"],
  ["levelrail", "levelrail.com/blog"],
  ["dev", "dev.to/thegdsks"],
  ["linkedin", "linkedin.com/in/gdsks"],
  ["npm", "npm: gdsks"],
  ["discord", "discord"],
];
// Each link is its own small image so the README can wrap it in a real <a>.
function linkPill(t, label) {
  const w = Math.ceil(label.length * 8.4 + 44);
  const body = `<text x="2" y="22" font-family="${MONO}" font-weight="500" font-size="14" fill="${t.ink}">${esc(label)}</text><text x="${w - 18}" y="22" font-family="${MONO}" font-weight="500" font-size="14" fill="${t.blue}">&#8599;</text><line x1="2" y1="32" x2="${w - 2}" y2="32" stroke="${t.rule}"/>`;
  return [w, wrap(w, 38, t, [FACES.mono], label, body)];
}

// GLINR Studios mark, mono variant from theSVG (glinr), 512 box.
const GLINR_MARK = "M256 40Q40 40 40 256c0 216 72 216 216 216s216-72 216-216c0-36-2-66-10-96-102-10-166-60-144-116-18-3-38-4-62-4";

function hero(t) {
  const W = 1200;
  const H = 384;
  const cx = 940;
  const cy = 172;
  const orbit = (r) => `M${cx - r} ${cy} a${r} ${r} 0 1 1 ${2 * r} 0 a${r} ${r} 0 1 1 ${-2 * r} 0`;
  const node = (x, y, label, anchor = "start", dx = 12) => `<circle cx="${x}" cy="${y}" r="4" fill="${t.bg}" stroke="${t.ink}" stroke-width="1.5"/><text x="${x + (anchor === "start" ? dx : -dx)}" y="${y + 4}" text-anchor="${anchor}" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1" fill="${t.sub}">${label}</text>`;
  const art = `
<defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${t.rule}"/></pattern></defs>
<rect width="${W}" height="${H}" fill="url(#dots)" opacity="0.7"/>
<g ${dl("r", 0.3)}>
<line x1="${cx - 170}" y1="${cy}" x2="${cx + 170}" y2="${cy}" stroke="${t.rule}"/><line x1="${cx}" y1="${cy - 148}" x2="${cx}" y2="${cy + 148}" stroke="${t.rule}"/>
<circle cx="${cx}" cy="${cy}" r="60" fill="none" stroke="${t.ink}" stroke-width="1.2" opacity="0.5"/>
<circle cx="${cx}" cy="${cy}" r="105" fill="none" stroke="${t.ink}" stroke-width="1.2" stroke-dasharray="2 7" opacity="0.7"><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="90s" repeatCount="indefinite"/></circle>
<circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="${t.ink}" stroke-width="1.2" opacity="0.35"/>
<circle cx="${cx}" cy="${cy}" r="36" fill="${t.blue}"/><g transform="translate(${cx - 22},${cy - 24}) scale(.086)"><path d="${GLINR_MARK}" fill="#fff"/></g>
<circle cx="${cx}" cy="${cy}" r="36" fill="none" stroke="${t.blue}" stroke-width="1.5"><animate attributeName="r" values="36;62" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="3s" repeatCount="indefinite"/></circle>
<circle r="6" fill="${t.blue}"><animateMotion dur="11s" repeatCount="indefinite" path="${orbit(105)}"/></circle>
<circle r="4" fill="${t.ink}"><animateMotion dur="19s" repeatCount="indefinite" path="${orbit(150)}" keyPoints="1;0" keyTimes="0;1" calcMode="linear"/></circle>
<circle r="3.5" fill="${t.ink}" opacity="0.6"><animateMotion dur="7s" repeatCount="indefinite" path="${orbit(60)}"/></circle>
${node(cx + 105, cy, "LEVELRAIL")}${node(cx - 75, cy - 92, "THESVG", "end")}${node(cx - 52, cy + 130, "THEAUTH", "end")}${node(cx + 88, cy - 122, "PROFCLAW")}${node(cx + 132, cy + 72, "STACKLIT")}
<text x="${cx}" y="${cy + 56}" text-anchor="middle" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.6" fill="${t.blue}">GLINR</text>
</g>`;
  const body = `${art}
<text ${dl("r", 0.1)} x="64" y="72" font-family="${MONO}" font-weight="500" font-size="13" letter-spacing="2.2" fill="${t.sub}">GLINR STUDIOS  /  OPEN SOURCE</text>
<text ${dl("r", 0.25)} x="64" y="172" font-family="${SERIF}" font-weight="500" font-size="84" letter-spacing="-2" fill="${t.ink}">Gagan Deep Singh</text>
<text ${dl("r", 0.55)} x="64" y="230" font-family="${SERIF}" font-style="italic" font-size="26" fill="${t.sub}">Software architect and open source</text>
<text ${dl("r", 0.65)} x="64" y="264" font-family="${SERIF}" font-style="italic" font-size="26" fill="${t.sub}">maintainer, building developer</text>
<text ${dl("r", 0.75)} x="64" y="298" font-family="${SERIF}" font-style="italic" font-size="26" fill="${t.sub}">infrastructure in public. Next up: <tspan fill="${t.blue}">robotics</tspan>.</text>
<line ${dl("d", 0.9)} x1="64" y1="326" x2="${W - 64}" y2="326" stroke="${t.rule}" stroke-width="1"/>
<circle cx="68" cy="355" r="4.5" fill="${t.blue}"/>
<circle cx="68" cy="355" r="4.5" fill="none" stroke="${t.blue}" stroke-width="1.5"><animate attributeName="r" values="4.5;13" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="2.6s" repeatCount="indefinite"/></circle>
<text x="84" y="360" font-family="${MONO}" font-weight="500" font-size="14" fill="${t.sub}">now: Levelrail</text>`;
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
        return `${div}<text ${dl("r", 0.2 + i * 0.12)} x="${cx}" y="62" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="${t.sub}">${label}</text><text ${dl("r", 0.3 + i * 0.12)} x="${cx}" y="124" font-family="${SERIF}" font-weight="500" font-size="56" letter-spacing="-1.2" fill="${i === 1 ? t.blue : t.ink}">${esc(value)}</text>`;
      })
      .join("") +
    `<line x1="64" y1="152" x2="${W - 64}" y2="152" stroke="${t.rule}"/>`;
  return wrap(W, H, t, [FACES.serif, FACES.mono], `GitHub stars ${stats.stars}, npm downloads per month ${stats.month}, ${stats.packages} packages, CDN hits per month ${stats.cdn}`, body);
}


const CAL_FILE = new URL("./contributions.json", import.meta.url);
// With a token, refresh the calendar from GitHub; otherwise (or on failure) use the cached copy.
if (process.env.GITHUB_TOKEN) {
  try {
    const q = `{user(login:"${process.env.PROFILE_GITHUB_USER ?? "thegdsks"}"){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
    const res = await fetch("https://api.github.com/graphql", { method: "POST", headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "user-agent": "profile-generator" }, body: JSON.stringify({ query: q }) });
    const json = await res.json();
    const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
    if (calendar) writeFileSync(CAL_FILE, `${JSON.stringify(calendar)}\n`);
  } catch {
    // keep the cached calendar
  }
}
const cal = JSON.parse(readFileSync(CAL_FILE, "utf8"));
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
    .map((w, i) => w.contributionDays.map((d, j) => `<rect ${dl("p", (0.3 + i * 0.02 + j * 0.01).toFixed(2))} x="${(64 + i * (cell + gap)).toFixed(1)}" y="${(76 + j * (cell + gap)).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="2" fill="${ramp[lvl(d.contributionCount)]}"/>`).join(""))
    .join("");
  const legend = ramp.map((c, i) => `<rect x="${W - 64 - 5 * 16 - 38 + i * 16}" y="${H - 28}" width="12" height="12" rx="2" fill="${c}"/>`).join("");
  const body = `<text x="64" y="44" font-family="${MONO}" font-weight="500" font-size="12" letter-spacing="1.8" fill="${t.sub}">CONTRIBUTIONS, LAST ${weeks >= 52 ? "YEAR" : weeks + " WEEKS"}</text><text x="${W - 64}" y="44" text-anchor="end" font-family="${SERIF}" font-weight="500" font-size="26" fill="${t.blue}">${total.toLocaleString("en-US")}</text>${rects}<text x="64" y="${H - 17}" font-family="${MONO}" font-weight="500" font-size="11" fill="${t.sub}">updated ${stats.updated}</text><text x="${W - 64 - 5 * 16 - 46}" y="${H - 17}" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="11" fill="${t.sub}">less</text><text x="${W - 64 + 0}" y="${H - 17}" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="11" fill="${t.sub}" opacity="0">.</text>${legend}`;
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
      return `<rect ${dl("g", (0.3 + i * 0.07).toFixed(2))} x="${(cx - bw / 2).toFixed(1)}" y="${(190 - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${best ? t.blue : t.ink}"/><text x="${cx.toFixed(1)}" y="214" text-anchor="middle" font-family="${MONO}" font-weight="500" font-size="11" fill="${t.sub}">${MONTHS[Number(m.slice(5)) - 1]}</text>${best ? `<text ${dl("r", (0.3 + i * 0.07 + 0.8).toFixed(2))} x="${cx.toFixed(1)}" y="${(190 - h - 10).toFixed(1)}" text-anchor="middle" font-family="${SERIF}" font-weight="500" font-size="22" fill="${t.blue}">${n.toLocaleString("en-US")}</text>` : ""}`;
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


// Small line drawing per project, top right of each card: ink strokes, one blue accent.
function motif(id, t) {
  const o = `fill="none" stroke="${t.ink}" stroke-width="1.5"`;
  const b = `fill="${t.blue}"`;
  const m = {
    levelrail: `<line x1="236" y1="40" x2="356" y2="40" ${o}/><line x1="236" y1="62" x2="356" y2="62" ${o}/>${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${244 + i * 22}" y1="36" x2="${244 + i * 22}" y2="66" stroke="${t.rule}" stroke-width="1.5"/>`).join("")}<circle cy="51" r="6" ${b}><animate attributeName="cx" values="236;356" dur="3.2s" repeatCount="indefinite"/></circle>`,
    thesvg: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const x = 252 + (i % 4) * 30; const y = 34 + Math.floor(i / 4) * 30; const hot = i === 5; const f = hot ? b : `fill="none" stroke="${t.ink}" stroke-width="1.5"`; const shape = [`<circle cx="${x}" cy="${y}" r="9" ${f}/>`, `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" ${f}/>`, `<path d="M${x} ${y - 10}L${x + 10} ${y + 8}L${x - 10} ${y + 8}Z" ${f}/>`, `<path d="M${x} ${y - 10}L${x + 10} ${y}L${x} ${y + 10}L${x - 10} ${y}Z" ${f}/>`][i % 4]; return shape; }).join(""),
    theauth: `<line x1="250" y1="32" x2="316" y2="54" ${o}/><line x1="250" y1="76" x2="316" y2="54" ${o}/><line x1="350" y1="54" x2="316" y2="54" ${o}/><circle cx="250" cy="32" r="6" fill="${t.bg}" stroke="${t.ink}" stroke-width="1.5"/><circle cx="250" cy="76" r="6" fill="${t.bg}" stroke="${t.ink}" stroke-width="1.5"/><circle cx="316" cy="54" r="10" ${b}/><circle cx="350" cy="54" r="5" fill="${t.bg}" stroke="${t.ink}" stroke-width="1.5"/>`,
    profclaw: [[120, 0], [92, 1], [108, 2], [64, 3]].map(([w, i]) => `<rect x="${356 - w}" y="${30 + i * 15}" width="${w}" height="7" fill="${i === 3 ? t.blue : t.rule}"/>`).join("") + `<rect class="k" x="${356 - 64 - 8}" y="${30 + 45}" width="4" height="7" ${b}/>`,
    askverdict: [34, 48, 62, 76].map((y) => `<path d="M240 ${y}C290 ${y} 300 55 340 55" ${o}/>`).join("") + `<circle cx="344" cy="55" r="7" ${b}/>`,
    stacklit: Array.from({ length: 22 }, (_, i) => `<line x1="${240 + i * 5.2}" y1="30" x2="${240 + i * 5.2}" y2="${i === 21 ? 78 : 66 - (i % 3) * 4}" stroke="${i === 21 ? t.blue : t.rule}" stroke-width="${i === 21 ? 3 : 1.5}"/>`).join(""),
  };
  return `<g ${dl("r", 0.2)}>${m[id] ?? ""}</g>`;
}

const ACCENT = {
  paper: { levelrail: "#7C3AED", thesvg: "#E8590C", theauth: "#0E8FA8", profclaw: "#D6407F", askverdict: "#12A06B", stacklit: "#B88A00" },
  ink: { levelrail: "#A78BFA", thesvg: "#FB923C", theauth: "#22D3EE", profclaw: "#F472B6", askverdict: "#34D399", stacklit: "#FACC15" },
};

function projectCard(t, p, themeName) {
  const [id, name, tag, desc] = p;
  const W = 588;
  const a = ACCENT[themeName][id];
  const at = { ...t, blue: a };
  const s = stats.projects.find((x) => x.id === id);
  const meta = [s?.stars ? `${fmt(s.stars)} stars` : "", s?.month ? `${fmt(s.month)} / mo` : ""].filter(Boolean).join("  \u00b7  ");
  const body = `<rect x="0.5" y="0.5" width="${W - 1}" height="229" fill="none" stroke="${t.rule}"/><defs><radialGradient id="w" cx="0.82" cy="0.38" r="0.5"><stop offset="0" stop-color="${a}" stop-opacity="${themeName === "paper" ? 0.2 : 0.26}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient></defs><rect x="1" y="1" width="${W - 2}" height="228" fill="url(#w)"/><rect width="${W}" height="3" fill="${a}"/><g transform="translate(${W - 28 - 1.7 * 356},2) scale(1.7)">${motif(id, at)}</g><text x="28" y="48" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="1.8" fill="${t.sub}">${tag}</text><text ${dl("r", 0.1)} x="28" y="110" font-family="${SERIF}" font-weight="500" font-size="48" letter-spacing="-1" fill="${t.ink}">${esc(name)}</text><text x="28" y="146" font-family="${SERIF}" font-style="italic" font-size="17" fill="${t.sub}">${esc(desc[0])}</text><text x="28" y="168" font-family="${SERIF}" font-style="italic" font-size="17" fill="${t.sub}">${esc(desc[1])}</text><line x1="28" y1="190" x2="${W - 28}" y2="190" stroke="${t.rule}"/><text x="28" y="214" font-family="${MONO}" font-weight="500" font-size="12" fill="${t.ink}">${esc(meta)}</text><text x="${W - 28}" y="214" text-anchor="end" font-family="${MONO}" font-weight="500" font-size="14" fill="${a}">&#8594;</text>`;
  return wrap(W, 230, t, [FACES.serif, FACES.serifI, FACES.mono], `${name}: ${desc.join(" ")}`, body);
}

function heroMobile(t) {
  const W = 640;
  const H = 330;
  const body = `<text ${dl("r", 0.1)} x="32" y="54" font-family="${MONO}" font-weight="500" font-size="11" letter-spacing="2" fill="${t.sub}">GLINR STUDIOS  /  OPEN SOURCE</text><text ${dl("r", 0.25)} x="32" y="124" font-family="${SERIF}" font-weight="500" font-size="54" letter-spacing="-1.2" fill="${t.ink}">Gagan Deep Singh</text><text ${dl("r", 0.55)} x="32" y="172" font-family="${SERIF}" font-style="italic" font-size="22" fill="${t.sub}">Software architect and open source</text><text ${dl("r", 0.65)} x="32" y="202" font-family="${SERIF}" font-style="italic" font-size="22" fill="${t.sub}">maintainer, building developer</text><text ${dl("r", 0.75)} x="32" y="232" font-family="${SERIF}" font-style="italic" font-size="22" fill="${t.sub}">infrastructure in public. Next up: <tspan fill="${t.blue}">robotics</tspan>.</text><line x1="32" y1="260" x2="${W - 32}" y2="260" stroke="${t.rule}"/><circle cx="36" cy="296" r="4.5" fill="${t.blue}"/><text x="52" y="301" font-family="${MONO}" font-weight="500" font-size="13" fill="${t.sub}">now: Levelrail</text>`;
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
  for (const [id, label] of LINKS) writeFileSync(`${OUT}/link-${id}-${name}.svg`, linkPill(t, label)[1]);
  writeFileSync(`${OUT}/stats-${name}.svg`, strip(t));
  writeFileSync(`${OUT}/hero-mobile-${name}.svg`, heroMobile(t));
  writeFileSync(`${OUT}/stats-mobile-${name}.svg`, stripMobile(t));
  writeFileSync(`${OUT}/graph-${name}.svg`, graph(t, name, 1200, 53));
  writeFileSync(`${OUT}/graph-mobile-${name}.svg`, graph(t, name, 640, 26));
  for (const p of PROJECTS) writeFileSync(`${OUT}/card-${p[0]}-${name}.svg`, projectCard(t, p, name));
}
console.log(`wrote paper cards to ${OUT}`);
