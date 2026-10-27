// Builds the profile README images (hero, stats panel, project cards) from live GitHub and npm numbers.
// Usage: node profile/generate.mjs [outDir]   (GITHUB_TOKEN raises the API limit)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? "profile/assets";
const USER = process.env.PROFILE_GITHUB_USER ?? "thegdsks";
const NPM_USER = process.env.PROFILE_NPM_USER ?? "gdsks";
const TOKEN = process.env.GITHUB_TOKEN ?? "";

const PROJECTS = [
  { id: "thesvg", name: "theSVG", repo: "glincker/thesvg", url: "https://thesvg.org", tag: "Open source", accent: "#F97316", desc: ["The open SVG brand library.", "7,600+ logos and 372 UI icons for React,", "Vue, Svelte, CDN, CLI and MCP."], npm: (n) => n === "thesvg" || n.startsWith("@thesvg/") },
  { id: "theauth", name: "theAuth", repo: "glincker/theauth", url: "https://theauth.dev", tag: "Auth", accent: "#22D3EE", desc: ["Auth for AI agents and humans.", "Agent identity, MCP OAuth 2.1,", "delegation and audit. TypeScript and Go."], npm: (n) => n.startsWith("@glinr/") },
  { id: "levelrail", name: "Levelrail", repo: "glincker/levelrail", url: "https://levelrail.com", tag: "Deploy", accent: "#A78BFA", desc: ["Self-hosted deploys.", "Git push, HTTPS, logs and rollback,", "no Kubernetes required."], npm: () => false },
  { id: "stacklit", name: "Stacklit", repo: "glincker/stacklit", url: "https://github.com/glincker/stacklit", tag: "Dev tool", accent: "#FACC15", desc: ["Codebase context for AI coding agents", "in about 250 tokens instead of 50,000.", "One command, Go CLI."], npm: (n) => n === "stacklit" },
  { id: "glinui", name: "GlinUI", repo: "glincker/glinui", url: "https://www.glinui.com", tag: "UI kit", accent: "#38BDF8", desc: ["Liquid glass components for React.", "50+ production primitives with", "frosted aesthetics."], npm: (n) => n === "glinui" || n.startsWith("@glinui/") },
  { id: "profclaw", name: "profClaw", repo: "profclaw/profclaw", url: "https://profclaw.ai", tag: "Agents", accent: "#F472B6", desc: ["Self-hosted AI agent engine.", "22 chat channels, 65 tools and 15 skills,", "works with any LLM provider."], npm: (n) => n === "profclaw" },
  { id: "askverdict", name: "AskVerdict", repo: "AskVerdict/askverdict", url: "https://askverdict.ai", tag: "AI", accent: "#34D399", desc: ["Multi-agent AI debate engine.", "Many models argue, one verdict.", "SDK, CLI and types."], npm: (n) => n === "askverdict" || n.startsWith("@askverdict/") },
  { id: "modern-cli", name: "Awesome Modern CLI", repo: "thegdsks/awesome-modern-cli", url: "https://github.com/thegdsks/awesome-modern-cli", tag: "Curated list", accent: "#FB923C", desc: ["280+ modern replacements for classic", "Unix tools. Faster, prettier, smarter", "command line utilities."], npm: () => false },
];

const THEMES = {
  dark: { bg1: "#0b0b10", bg2: "#17110c", card: "#121218", stroke: "#2a2a35", text: "#f4f4f5", sub: "#a1a1aa", dim: "#71717a", grid: "#ffffff" },
  light: { bg1: "#ffffff", bg2: "#fff4ea", card: "#ffffff", stroke: "#e4e4e7", text: "#18181b", sub: "#52525b", dim: "#71717a", grid: "#000000" },
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const darken = (hex, k) => `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k)).toString(16).padStart(2, "0")).join("")}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(0)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));

const gh = async (path) => {
  const r = await fetch(`https://api.github.com/${path}`, { headers: { "user-agent": "profile-generator", ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) } });
  if (!r.ok) throw new Error(`GitHub ${path}: ${r.status}`);
  return r.json();
};
// npm answers 429 when it is hit too fast, so back off for longer each time instead of counting the package as zero.
const retry = async (fn, tries = 8) => {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
};
// One daily series per package gives both the last 30 days and the last year in a single request.
const npmDownloads = (name) =>
  retry(async () => {
    const r = await fetch(`https://api.npmjs.org/downloads/range/last-year/${name.replace("/", "%2F")}`);
    if (r.status === 404) return { month: 0, year: 0 };
    if (r.status === 429) {
      await new Promise((res) => setTimeout(res, (Number(r.headers.get("retry-after")) || 20) * 1000));
      throw new Error(`npm ${name}: 429`);
    }
    if (!r.ok) throw new Error(`npm ${name}: ${r.status}`);
    const days = (await r.json()).downloads ?? [];
    const total = (list) => list.reduce((a, d) => a + d.downloads, 0);
    return { month: total(days.slice(-30)), year: total(days) };
  });

async function npmPackages() {
  const names = [];
  for (let from = 0; ; from += 250) {
    const r = await retry(async () => {
      const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=maintainer:${NPM_USER}&size=250&from=${from}`);
      if (!res.ok) throw new Error(`npm search: ${res.status}`);
      return res.json();
    });
    names.push(...r.objects.map((o) => o.package.name));
    if (names.length >= r.total || r.objects.length === 0) break;
  }
  return [...new Set(names)];
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]);
    }
  }));
  return out;
}

const user = await gh(`users/${USER}`);
const repoStars = await Promise.all(PROJECTS.map((p) => gh(`repos/${p.repo}`).then((r) => r.stargazers_count).catch(() => 0)));
// Stars across the account and the orgs it works in, counted over public repos.
const owners = [USER, ...(await gh(`users/${USER}/orgs`)).map((o) => o.login)];
let totalStars = 0;
let totalRepos = 0;
for (const o of owners) {
  const kind = o === USER ? "users" : "orgs";
  for (let page = 1; ; page++) {
    const list = await gh(`${kind}/${o}/repos?per_page=100&type=owner&page=${page}`).catch(() => []);
    for (const r of list) {
      if (r.fork) continue;
      totalStars += r.stargazers_count;
      totalRepos += 1;
    }
    if (list.length < 100) break;
  }
}

const PREVIEW = process.env.PROFILE_PREVIEW === "1";
const pkgs = PREVIEW ? ["thesvg", "@glinr/theauth"] : await npmPackages();
const rows = PREVIEW
  ? [{ name: "thesvg", month: 4200, year: 31000 }, { name: "@glinr/theauth", month: 1363, year: 9000 }]
  : await pool(pkgs, 1, async (name) => {
      // A package that stays unreachable counts as zero for this run rather than failing the whole page.
      const d = await npmDownloads(name).catch(() => ({ month: 0, year: 0 }));
      await new Promise((res) => setTimeout(res, 300));
      return { name, ...d };
    });
const sum = (pick, key) => rows.filter((r) => pick(r.name)).reduce((a, r) => a + r[key], 0);
const totalMonth = rows.reduce((a, r) => a + r.month, 0);
const totalYear = rows.reduce((a, r) => a + r.year, 0);

const stats = {
  stars: totalStars,
  followers: user.followers,
  repos: totalRepos,
  packages: pkgs.length,
  month: totalMonth,
  year: totalYear,
  updated: new Date().toISOString().slice(0, 10),
};

// ---------- hero ----------
const heroLines = [
  "Software architect and open source maintainer",
  "theSVG: 7,600+ brand logos and 372 UI icons",
  "Levelrail deploys. theAuth for AI agents.",
  "Open source, shipped every week.",
];
function hero(t) {
  const lines = heroLines
    .map((l, i) => `<text x="80" y="212" font-size="26" font-weight="500" fill="${t.sub}" opacity="${i === 0 ? 1 : 0}"><animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.04;0.22;0.26;1" dur="${heroLines.length * 3.2}s" begin="${i * 3.2}s" repeatCount="indefinite"/>${esc(l)}</text>`)
    .join("");
  const dots = Array.from({ length: 12 }, (_, y) => Array.from({ length: 40 }, (_, x) => `<circle cx="${20 + x * 30}" cy="${16 + y * 28}" r="1" fill="${t.grid}" opacity="0.07"/>`).join("")).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="340" viewBox="0 0 1200 340" font-family="${FONT}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
<linearGradient id="name" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F97316"/><stop offset="0.55" stop-color="#F472B6"/><stop offset="1" stop-color="#A78BFA"/></linearGradient>
<radialGradient id="o1"><stop offset="0" stop-color="#F97316" stop-opacity="0.35"/><stop offset="1" stop-color="#F97316" stop-opacity="0"/></radialGradient>
<radialGradient id="o2"><stop offset="0" stop-color="#A78BFA" stop-opacity="0.3"/><stop offset="1" stop-color="#A78BFA" stop-opacity="0"/></radialGradient>
<clipPath id="r"><rect width="1200" height="340" rx="22"/></clipPath>
</defs>
<g clip-path="url(#r)">
<rect width="1200" height="340" fill="url(#bg)"/>
${dots}
<circle cx="980" cy="90" r="240" fill="url(#o1)"><animateTransform attributeName="transform" type="translate" values="0 0;-60 40;0 0" dur="14s" repeatCount="indefinite"/></circle>
<circle cx="1120" cy="300" r="210" fill="url(#o2)"><animateTransform attributeName="transform" type="translate" values="0 0;50 -30;0 0" dur="17s" repeatCount="indefinite"/></circle>
<text x="80" y="92" font-size="15" font-weight="600" letter-spacing="3" fill="#F97316">GLINCKER  ·  GLINR STUDIOS</text>
<text x="80" y="166" font-size="68" font-weight="800" fill="url(#name)">Gagan Deep Singh<tspan font-size="24" font-weight="500" fill="${t.dim}" dx="20">@thegdsks</tspan></text>
${lines}
<g transform="translate(80 262)">
<rect width="168" height="34" rx="17" fill="${t.card}" stroke="${t.stroke}"/><text x="84" y="22" font-size="14" font-weight="600" text-anchor="middle" fill="${t.text}">thegdsks.com</text>
<rect x="182" width="170" height="34" rx="17" fill="${t.card}" stroke="${t.stroke}"/><text x="267" y="22" font-size="14" font-weight="600" text-anchor="middle" fill="${t.text}">Shipping in public</text>
</g>
</g>
<rect x="0.5" y="0.5" width="1199" height="339" rx="22" fill="none" stroke="${t.stroke}"/>
</svg>`;
}

// ---------- stats panel ----------
function panel(t) {
  const tiles = [
    ["Stars earned", fmt(stats.stars), "#F97316"],
    ["Followers", fmt(stats.followers), "#F472B6"],
    ["Open source repos", fmt(stats.repos), "#A78BFA"],
    ["npm packages", fmt(stats.packages), "#22D3EE"],
    ["Downloads / month", fmt(stats.month), "#34D399"],
    ["Downloads / year", fmt(stats.year), "#FACC15"],
  ];
  const w = 186;
  const body = tiles
    .map(([label, value, c], i) => `<g transform="translate(${24 + i * (w + 12)} 24)">
<rect width="${w}" height="118" rx="16" fill="${t.card}" stroke="${t.stroke}"/>
<rect x="18" y="20" width="26" height="4" rx="2" fill="${c}"/>
<text x="18" y="74" font-size="40" font-weight="800" fill="${t.text}">${esc(value)}</text>
<text x="18" y="100" font-size="13.5" font-weight="500" fill="${t.sub}">${esc(label)}</text></g>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="190" viewBox="0 0 1200 190" font-family="${FONT}">
<rect width="1200" height="190" rx="22" fill="${t.bg1}"/>
<rect width="1200" height="190" rx="22" fill="url(#g)"/>
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}" stop-opacity="0"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient></defs>
${body}
<text x="1176" y="176" font-size="11" text-anchor="end" fill="${t.dim}">live from GitHub and npm, updated ${stats.updated}</text>
<rect x="0.5" y="0.5" width="1199" height="189" rx="22" fill="none" stroke="${t.stroke}"/>
</svg>`;
}

// ---------- project cards ----------
function card(t, p, stars, month) {
  const meta = [`${fmt(stars)} stars`, month > 0 ? `${fmt(month)} npm / month` : null].filter(Boolean);
  let mx = 28;
  const chips = meta
    .map((m) => {
      const w = 22 + m.length * 7.2;
      const g = `<g transform="translate(${mx} 128)"><rect width="${w}" height="26" rx="13" fill="${p.accent}" fill-opacity="0.14"/><text x="${w / 2}" y="17.5" font-size="12.5" font-weight="600" text-anchor="middle" fill="${t.text}">${esc(m)}</text></g>`;
      mx += w + 8;
      return g;
    })
    .join("");
  const desc = p.desc.map((l, i) => `<text x="28" y="${74 + i * 20}" font-size="14.5" fill="${t.sub}">${esc(l)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="580" height="176" viewBox="0 0 580 176" font-family="${FONT}">
<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0.2"/></linearGradient>
<radialGradient id="glow" cx="1" cy="0" r="0.9"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.2"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient></defs>
<rect width="580" height="176" rx="20" fill="${t.card}"/>
<rect width="580" height="176" rx="20" fill="url(#glow)"/>
<rect x="28" y="0" width="64" height="4" rx="2" fill="url(#a)"/>
<text x="28" y="44" font-size="22" font-weight="800" fill="${t.text}">${esc(p.name)}</text>
<g transform="translate(552 28)"><rect x="-${20 + p.tag.length * 6.4}" y="-14" width="${20 + p.tag.length * 6.4}" height="24" rx="12" fill="none" stroke="${t.stroke}"/><text x="-${(20 + p.tag.length * 6.4) / 2}" y="2.5" font-size="11.5" font-weight="600" text-anchor="middle" fill="${t.dim}">${esc(p.tag.toUpperCase())}</text></g>
${desc}
${chips}
<text x="552" y="146" font-size="13" font-weight="600" text-anchor="end" fill="${t === THEMES.light ? darken(p.accent, 0.4) : p.accent}">${esc(p.url.replace(/^https:\/\/(www\.)?/, ""))}  →</text>
<rect x="0.5" y="0.5" width="579" height="175" rx="20" fill="none" stroke="${t.stroke}"/>
</svg>`;
}

mkdirSync(OUT, { recursive: true });
for (const [mode, t] of Object.entries(THEMES)) {
  writeFileSync(join(OUT, `hero-${mode}.svg`), hero(t));
  writeFileSync(join(OUT, `stats-${mode}.svg`), panel(t));
  PROJECTS.forEach((p, i) => writeFileSync(join(OUT, `card-${p.id}-${mode}.svg`), card(t, p, repoStars[i] ?? 0, sum(p.npm, "month"))));
}
writeFileSync(join(OUT, "stats.json"), `${JSON.stringify({ ...stats, projects: PROJECTS.map((p, i) => ({ id: p.id, stars: repoStars[i], month: sum(p.npm, "month") })) }, null, 2)}\n`);
console.log("stats", stats);
