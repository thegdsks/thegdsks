// Builds the profile README images (hero, stats panel, project cards) from live GitHub and npm numbers.
// Usage: node profile/generate.mjs [outDir]   (GITHUB_TOKEN raises the API limit)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? "profile/assets";
const USER = process.env.PROFILE_GITHUB_USER ?? "thegdsks";
const NPM_USER = process.env.PROFILE_NPM_USER ?? "gdsks";
const TOKEN = process.env.GITHUB_TOKEN ?? "";

const PROJECTS = [
  { id: "thesvg", name: "theSVG", repo: "glincker/thesvg", url: "https://thesvg.org", tag: "Open source", accent: "#F97316", desc: ["The open SVG brand library. 7,600+ logos and", "372 UI icons for React, Vue, CDN, CLI and MCP."], npm: (n) => n === "thesvg" || n.startsWith("@thesvg/") },
  { id: "theauth", name: "theAuth", repo: "glincker/theauth", url: "https://theauth.dev", tag: "Auth", accent: "#22D3EE", desc: ["Auth for AI agents and humans: agent identity,", "MCP OAuth 2.1, delegation and audit."], npm: (n) => n.startsWith("@glinr/") },
  { id: "levelrail", name: "Levelrail", repo: "glincker/levelrail", url: "https://levelrail.com", tag: "Deploy", accent: "#A78BFA", desc: ["Self-hosted deploys. Git push, HTTPS, logs and", "rollback, no Kubernetes required."], npm: () => false },
  { id: "stacklit", name: "Stacklit", repo: "glincker/stacklit", url: "https://github.com/glincker/stacklit", tag: "Dev tool", accent: "#FACC15", desc: ["Codebase context for AI coding agents in about", "250 tokens instead of 50,000. One Go command."], term: ["$ stacklit","scanning 1,284 files ........ ok","wrote stacklit.json","context: 250 tokens (was 50,000)"], npm: (n) => n === "stacklit" },
  { id: "glinui", name: "GlinUI", repo: "glincker/glinui", url: "https://www.glinui.com", tag: "UI kit", accent: "#38BDF8", desc: ["Liquid glass components for React. 50+", "production primitives with frosted aesthetics."], npm: (n) => n === "glinui" || n.startsWith("@glinui/") },
  { id: "profclaw", name: "profClaw", repo: "profclaw/profclaw", url: "https://profclaw.ai", tag: "Agents", accent: "#F472B6", desc: ["Self-hosted AI agent engine: 22 chat channels,", "65 tools and 15 skills, any LLM provider."], npm: (n) => n === "profclaw" },
  { id: "askverdict", name: "AskVerdict", repo: "AskVerdict/askverdict", url: "https://askverdict.ai", tag: "AI", accent: "#34D399", desc: ["Multi-agent AI debate engine. Many models", "argue, one verdict. SDK, CLI and types."], npm: (n) => n === "askverdict" || n.startsWith("@askverdict/") },
  { id: "modern-cli", name: "Awesome Modern CLI", repo: "thegdsks/awesome-modern-cli", url: "https://github.com/thegdsks/awesome-modern-cli", tag: "Curated list", accent: "#FB923C", desc: ["280+ modern replacements for classic Unix", "tools. Faster, prettier, smarter."], term: ["$ cat  ->  bat","$ ls   ->  eza","$ find ->  fd","$ grep ->  rg","$ top  ->  btop"], npm: () => false },
];

const THEMES = {
  dark: { bg1: "#0d0d09", bg2: "#0a100e", card: "#11110d", stroke: "#2b2b22", text: "#f4f4f1", sub: "#a8a89c", dim: "#76766a", grid: "#ffffff", glowA: "#14b8a6", glowB: "#c9b01a", grain: 0.5 },
  light: { bg1: "#fbfaf5", bg2: "#f1f5f2", card: "#ffffff", stroke: "#e4e4dc", text: "#18181b", sub: "#52525b", dim: "#71717a", grid: "#000000", glowA: "#14b8a6", glowB: "#e0b400", grain: 0.18 },
};
const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const darken = (hex, k) => `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k)).toString(16).padStart(2, "0")).join("")}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Fine film grain: noise thresholded into sparse light specks, so it works on the dark look and, fainter, on the light one.
const grain = (id, w, h, strength) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.1 0 0 0 -0.42"/></filter><rect width="${w}" height="${h}" filter="url(#${id})" opacity="${strength}" style="mix-blend-mode:screen"/>`;
// Grain glow, as on the theAuth and Levelrail sites: a soft glow plus the same shapes cut through thresholded noise,
// so the glow dissolves into coloured dots. Blobs are { cx, cy, rx, ry, color, a }.
const dotGlow = (id, blobs, soft, dots) => {
  const grads = blobs
    .map((b, i) => `<radialGradient id="${id}-g${i}"><stop offset="0" stop-color="${b.color}" stop-opacity="${b.a}"/><stop offset="1" stop-color="${b.color}" stop-opacity="0"/></radialGradient>`)
    .join("");
  const shapes = blobs.map((b, i) => `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="url(#${id}-g${i})"/>`).join("");
  return `<defs>${grads}<filter id="${id}-f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="2" seed="3" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  9 0 0 0 -4.3" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs><g opacity="${soft}">${shapes}</g><g filter="url(#${id}-f)" opacity="${dots}">${shapes}</g>`;
};
// The site palette: violet, teal, green and yellow across the top edge.
const heroBlobs = (k) => [
  { cx: 600, cy: 0, rx: 340, ry: 200, color: "#b6abff", a: 0.5 * k },
  { cx: 330, cy: 0, rx: 210, ry: 170, color: "#58b1ce", a: 0.5 * k },
  { cx: 60, cy: 0, rx: 240, ry: 160, color: "#00cbaa", a: 0.42 * k },
  { cx: 1140, cy: 0, rx: 230, ry: 150, color: "#eef35f", a: 0.3 * k },
];
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
const repoMeta = await Promise.all(PROJECTS.map((p) => gh(`repos/${p.repo}`).catch(() => null)));
const repoStars = repoMeta.map((r) => r?.stargazers_count ?? 0);
// The link on a card follows the repository's homepage field, so changing it on GitHub updates the page.
PROJECTS.forEach((p, i) => {
  const home = repoMeta[i]?.homepage;
  if (home && /^https:\/\//.test(home)) p.url = home.replace(/#.*$/, "").replace(/\/$/, "");
});
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

// jsDelivr serves theSVG's files straight from the repo and its npm packages: that is where the biggest number is.
const cdnTargets = ["gh/glincker/thesvg", ...pkgs.filter(PROJECTS[0].npm).map((n) => `npm/${n}`)];
const cdnHits = PREVIEW
  ? 12900000
  : (
      await pool(cdnTargets, 3, (target) =>
        retry(async () => {
          const r = await fetch(`https://data.jsdelivr.com/v1/stats/packages/${target}?period=month`);
          if (r.status === 404) return 0;
          if (!r.ok) throw new Error(`jsDelivr ${target}: ${r.status}`);
          return (await r.json()).hits?.total ?? 0;
        }, 4).catch(() => 0),
      )
    ).reduce((a, b) => a + b, 0);
const totalYear = rows.reduce((a, r) => a + r.year, 0);

const stats = {
  stars: totalStars,
  repos: totalRepos,
  packages: pkgs.length,
  month: totalMonth,
  year: totalYear,
  cdn: cdnHits,
  updated: new Date().toISOString().slice(0, 10),
};

// ---------- hero ----------
const heroLines = [
  "Software architect and open source maintainer",
  "Founder of GLINR Studios",
  "Now stepping into robotics",
  "theSVG: 7,600+ brand logos and 372 UI icons",
  "Open source, shipped every week",
];
// Icons that are white on dark pages have a black twin for light pages, named in `light`.
const STACK = [
  { slug: "typescript" },
  { slug: "go", light: "light" },
  { slug: "react" },
  { slug: "swift" },
  { slug: "python" },
  { slug: "tailwindcss" },
  { slug: "postgresql" },
  { slug: "redis" },
  { slug: "docker" },
  { slug: "kubernetes" },
  { slug: "cloudflare" },
];
const iconHref = (slug, variant) =>
  retry(async () => {
    const r = await fetch(`https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/${slug}/${variant}.svg`);
    if (!r.ok) throw new Error(`icon ${slug}/${variant}: ${r.status}`);
    return `data:image/svg+xml;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  }, 3).catch(() => "");
const stackIcons = (
  await Promise.all(STACK.map(async (i) => ({ dark: await iconHref(i.slug, "default"), light: i.light ? await iconHref(i.slug, i.light) : "" })))
).filter((i) => i.dark);
const BRANDS = [
  { name: "theSVG", url: "https://raw.githubusercontent.com/glincker/thesvg/main/public/logo.svg" },
  { name: "Levelrail", url: "https://levelrail.com/favicon.svg" },
  { name: "GLINR", url: `https://github.com/glincker.png?size=120` },
  { name: "theAuth", url: "https://theauth.dev/favicon.svg" },
  { name: "AskVerdict", url: "https://www.askverdict.ai/icon.svg" },
];
const brandLogos = (
  await Promise.all(
    BRANDS.map((b) =>
      retry(async () => {
        const r = await fetch(b.url);
        if (!r.ok) throw new Error(`${b.name}: ${r.status}`);
        const type = (r.headers.get("content-type") ?? "").split(";")[0] || "image/png";
        return { name: b.name, href: `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}` };
      }, 3).catch(() => null),
    ),
  )
).filter(Boolean);
const b64 = (buf) => Buffer.from(buf).toString("base64");
// The data URI needs the real image type, GitHub serves a PNG or a JPEG depending on the upload.
const avatar = await retry(async () => {
  const r = await fetch(`https://github.com/${USER}.png?size=240`);
  if (!r.ok) throw new Error(`avatar: ${r.status}`);
  return `data:${r.headers.get("content-type") ?? "image/png"};base64,${b64(await r.arrayBuffer())}`;
}).catch(() => "");

// Latest release across the two repos that ship most often. Tags like @thesvg/cli@0.8.0 are shortened to a name and version.
const latest = (
  await Promise.all(["glincker/levelrail", "glincker/thesvg"].map((r) => gh(`repos/${r}/releases?per_page=5`).catch(() => [])))
)
  .flat()
  .filter((r) => !r.draft && !r.prerelease)
  .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0];
const shortTag = (r) => {
  const tag = decodeURIComponent(r.tag_name);
  const repo = r.html_url.split("/")[4];
  const m = tag.match(/^(@?[\w./-]+?)@(\d[\w.-]*)$/);
  return m ? `${m[1].replace(/^@/, "")} ${m[2]}` : `${repo} ${tag}`;
};
const ago = (iso) => {
  const d = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3600000));
  return d < 1 ? "just now" : d < 24 ? `${d}h ago` : `${Math.round(d / 24)}d ago`;
};

// ---------- shared ----------
// Inter (the theAuth and Levelrail typeface), subset and embedded so the SVG needs nothing external.
const INTER = readFileSync(new URL("./fonts/inter-subset.woff", import.meta.url));
const FONT_FACE = `<style>@font-face{font-family:'Inter';src:url(data:font/woff;base64,${b64(INTER)}) format('woff');font-weight:100 900;font-style:normal}</style>`;
const withFont = (svg) => svg.replace("<defs>", `<defs>${FONT_FACE}`);
const chipW = (name) => 46 + name.length * 7.6;
const brandChip = (t, b, x, y) =>
  `<g transform="translate(${x} ${y})"><rect width="${chipW(b.name)}" height="38" rx="19" fill="${t.card}" fill-opacity="0.85" stroke="${t.stroke}"/><clipPath id="bl-${b.name}-${Math.round(x)}-${Math.round(y)}"><rect x="7" y="7" width="24" height="24" rx="7"/></clipPath><image x="7" y="7" width="24" height="24" clip-path="url(#bl-${b.name}-${Math.round(x)}-${Math.round(y)})" href="${b.href}"/><text x="39" y="24.5" font-size="13.5" font-weight="700" fill="${t.text}">${esc(b.name)}</text></g>`;
const stackStrip = (t, size, gap) => stackIcons.map((icon, i) => `<g transform="translate(${i * (size + gap)} 0)"><rect width="${size}" height="${size}" rx="${size * 0.28}" fill="${t.card}" stroke="${t.stroke}"/><image x="${size * 0.21}" y="${size * 0.21}" width="${size * 0.58}" height="${size * 0.58}" href="${t === THEMES.light && icon.light ? icon.light : icon.dark}"/></g>`).join("");
const tiles = () => [
  ["LATEST RELEASE", latest ? shortTag(latest) : "shipping weekly", latest ? ago(latest.published_at) : "", "#F97316"],
  ["TOP PROJECT", "theSVG", `${fmt(repoStars[0] ?? 0)} stars`, "#F472B6"],
  ["CDN HITS", fmt(stats.cdn), "jsDelivr, this month", "#34D399"],
];
const tile = (t, [label, value, sub, c], x, y, w, h) => `<g transform="translate(${x} ${y})">
<rect width="${w}" height="${h}" rx="16" fill="${t.card}" fill-opacity="0.82" stroke="${t.stroke}"/>
<rect x="16" y="18" width="18" height="3" rx="1.5" fill="${c}"/>
<text x="44" y="24" font-size="10.5" font-weight="700" letter-spacing="1.6" fill="${t.dim}">${esc(label)}</text>
<text x="16" y="${h - (h < 76 ? 14 : 26)}" font-size="22" font-weight="800" fill="${t.text}">${esc(value.length > 24 ? value.slice(0, 23) + "..." : value)}</text>
<text x="${w - 16}" y="${h - (h < 76 ? 14 : 26)}" font-size="12.5" font-weight="600" text-anchor="end" fill="${t.sub}">${esc(sub)}</text></g>`;
const gradients = (t) => `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
<linearGradient id="name" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F97316"/><stop offset="0.55" stop-color="#F472B6"/><stop offset="1" stop-color="#A78BFA"/></linearGradient>`;
// Static on purpose: an animated svg would repaint its grain filters on every frame for every visitor.
const taglines = (t, x, y, size, anchor, gap) =>
  ["Software architect and open source maintainer", "Founder of GLINR Studios, now stepping into robotics"]
    .map((l, i) => `<text x="${x}" y="${y + i * gap}" font-size="${size}" font-weight="${i === 0 ? 500 : 400}" text-anchor="${anchor}" fill="${i === 0 ? t.text : t.sub}" fill-opacity="${i === 0 ? 0.9 : 1}">${esc(l)}</text>`)
    .join("");
const dotsField = (t, w, h) => Array.from({ length: Math.ceil(h / 28) }, (_, y) => Array.from({ length: Math.ceil(w / 30) }, (_, x) => `<circle cx="${20 + x * 30}" cy="${16 + y * 28}" r="1" fill="${t.grid}" opacity="0.07"/>`).join("")).join("");
const avatarFace = (cx, cy, r) =>
  avatar ? `<circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="none" stroke="url(#name)" stroke-width="4"/><clipPath id="av"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><image x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#av)" href="${avatar}"/>` : "";

// ---------- hero, desktop ----------
function hero(t) {
  const k = t === THEMES.light ? 0.55 : 1;
  let x = 0;
  const chips = brandLogos.map((b) => { const g = brandChip(t, b, x, 0); x += chipW(b.name) + 8; return g; }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="380" viewBox="0 0 1200 380" font-family="${FONT}">
<defs>${gradients(t)}<clipPath id="r"><rect width="1200" height="380" rx="22"/></clipPath></defs>
<g clip-path="url(#r)">
<rect width="1200" height="380" fill="url(#bg)"/>
${dotsField(t, 1200, 380)}
${dotGlow("hg", heroBlobs(k), t === THEMES.light ? 0.5 : 0.7, 1)}
<g aria-hidden="true">
<text x="250" y="86" font-size="80" font-weight="800" fill="url(#name)" fill-opacity="0.09" stroke="${t.grid}" stroke-opacity="0.16" stroke-width="1" letter-spacing="-1">GDS K S</text>
</g>
${avatarFace(140, 182, 66)}
<text x="250" y="98" font-size="13" font-weight="700" letter-spacing="3" fill="#F97316">FOUNDER, GLINR STUDIOS<tspan font-size="14" font-weight="500" letter-spacing="0" fill="${t.dim}" dx="16">@${esc(USER)}</tspan></text>
<text x="250" y="158" font-size="52" fill="url(#name)" letter-spacing="-1"><tspan font-weight="300">Building </tspan><tspan font-weight="800">What Matters.</tspan></text>
<text x="252" y="200" font-size="28" font-weight="600" fill="url(#name)">Gagan Deep Singh</text>
${taglines(t, 252, 230, 18, "start", 24)}
<g transform="translate(250 268)">${chips}</g>
<g transform="translate(250 330)"><text x="0" y="-8" font-size="10.5" font-weight="700" letter-spacing="1.6" fill="${t.dim}">I BUILD WITH</text><g transform="translate(0 4)">${stackStrip(t, 38, 16)}</g></g>
${tiles().map((d, i) => tile(t, d, 850, 48 + i * 96, 310, 80)).join("")}
${grain("gr", 1200, 380, t.grain * 0.3)}
</g>
<rect x="0.5" y="0.5" width="1199" height="379" rx="22" fill="none" stroke="${t.stroke}"/>
</svg>`;
}

// ---------- hero, mobile: one column, readable at phone width ----------
function heroMobile(t) {
  const W = 520;
  const k = t === THEMES.light ? 0.55 : 1;
  const rows = [[]];
  let rowW = 0;
  for (const b of brandLogos) {
    const w = chipW(b.name);
    if (rowW + w > W - 40 && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
    rows[rows.length - 1].push(b);
    rowW += w + 8;
  }
  let y = 372;
  const chipRows = rows.map((row) => {
    const total = row.reduce((a, b) => a + chipW(b.name) + 8, -8);
    let x = (W - total) / 2;
    const g = row.map((b) => { const c = brandChip(t, b, x, y); x += chipW(b.name) + 8; return c; }).join("");
    y += 46;
    return g;
  }).join("");
  const tilesY = y + 14;
  const tl = tiles().map((d, i) => tile(t, d, 32, tilesY + i * 80, W - 64, 70)).join("");
  const stackY = tilesY + 3 * 80 + 30;
  const iconSize = 36;
  const stackW = stackIcons.length * (iconSize + 7) - 7;
  const H = stackY + iconSize + 36;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<defs>${gradients(t)}<clipPath id="r"><rect width="${W}" height="${H}" rx="22"/></clipPath></defs>
<g clip-path="url(#r)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${dotsField(t, W, H)}
${dotGlow("hg", [{ cx: 260, cy: 0, rx: 320, ry: 300, color: "#b6abff", a: 0.45 * k }, { cx: 90, cy: 0, rx: 230, ry: 260, color: "#58b1ce", a: 0.45 * k }, { cx: 10, cy: 40, rx: 220, ry: 250, color: "#00cbaa", a: 0.38 * k }, { cx: 510, cy: 0, rx: 230, ry: 240, color: "#eef35f", a: 0.26 * k }], t === THEMES.light ? 0.5 : 0.7, 1)}
${avatarFace(260, 100, 54)}
<text x="260" y="196" font-size="11" font-weight="700" letter-spacing="3" text-anchor="middle" fill="#F97316">FOUNDER, GLINR STUDIOS</text>
<text x="260" y="246" font-size="36" text-anchor="middle" fill="url(#name)" letter-spacing="-1"><tspan font-weight="300">Building </tspan><tspan font-weight="800">What Matters.</tspan></text>
<text x="260" y="284" font-size="23" font-weight="600" text-anchor="middle" fill="url(#name)">Gagan Deep Singh</text>
${taglines(t, 260, 314, 15, "middle", 22)}
${chipRows}
${tl}
<text x="${(W - stackW) / 2}" y="${stackY - 10}" font-size="10" font-weight="700" letter-spacing="1.6" fill="${t.dim}">I BUILD WITH</text>
<g transform="translate(${(W - stackW) / 2} ${stackY})">${stackStrip(t, iconSize, 7)}</g>
${grain("gr", W, H, t.grain * 0.3)}
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${t.stroke}"/>
</svg>`;
}

// ---------- stats ----------
const statTiles = () => [
  ["Stars earned", fmt(stats.stars), "#F97316"],
  ["Open source repos", fmt(stats.repos), "#A78BFA"],
  ["npm packages", fmt(stats.packages), "#22D3EE"],
  ["npm downloads / month", fmt(stats.month), "#34D399"],
  ["jsDelivr hits / month", fmt(stats.cdn), "#F472B6"],
  ["npm downloads / year", fmt(stats.year), "#FACC15"],
];
const statTile = (t, [label, value, c], x, y, w, h) => `<g transform="translate(${x} ${y})">
<rect width="${w}" height="${h}" rx="16" fill="${t.card}" stroke="${t.stroke}"/>
<rect x="18" y="20" width="26" height="4" rx="2" fill="${c}"/>
<text x="18" y="${h - 44}" font-size="40" font-weight="800" fill="${t.text}">${esc(value)}</text>
<text x="18" y="${h - 18}" font-size="13.5" font-weight="500" fill="${t.sub}">${esc(label)}</text></g>`;
function panel(t) {
  const w = 182;
  const body = statTiles().map((d, i) => statTile(t, d, 24 + i * (w + 12), 24, w, 118)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="190" viewBox="0 0 1200 190" font-family="${FONT}">
<defs>${gradients(t)}<clipPath id="r"><rect width="1200" height="190" rx="22"/></clipPath></defs>
<g clip-path="url(#r)"><rect width="1200" height="190" fill="url(#bg)"/>
${body}
${dotGlow("sg", [{ cx: 200, cy: 195, rx: 380, ry: 110, color: "#b6abff", a: 0.4 }, { cx: 640, cy: 200, rx: 330, ry: 100, color: "#58b1ce", a: 0.35 }, { cx: 1060, cy: 195, rx: 320, ry: 100, color: "#00cbaa", a: 0.35 }], 0.4, 1)}
<text x="1176" y="176" font-size="11" text-anchor="end" fill="${t.dim}">live from GitHub, npm and jsDelivr, updated ${stats.updated}</text></g>
<rect x="0.5" y="0.5" width="1199" height="189" rx="22" fill="none" stroke="${t.stroke}"/>
</svg>`;
}
function panelMobile(t) {
  const W = 520;
  const w = 236;
  const h = 104;
  const body = statTiles().map((d, i) => statTile(t, d, 16 + (i % 2) * (w + 16), 16 + Math.floor(i / 2) * (h + 12), w, h)).join("");
  const H = 16 + 3 * (h + 12) + 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<defs>${gradients(t)}<clipPath id="r"><rect width="${W}" height="${H}" rx="22"/></clipPath></defs>
<g clip-path="url(#r)"><rect width="${W}" height="${H}" fill="url(#bg)"/>
${body}
${dotGlow("sg", [{ cx: 120, cy: H, rx: 300, ry: 110, color: "#b6abff", a: 0.4 }, { cx: 400, cy: H, rx: 300, ry: 110, color: "#00cbaa", a: 0.35 }], 0.4, 1)}
<text x="${W - 16}" y="${H - 8}" font-size="10" text-anchor="end" fill="${t.dim}">live, updated ${stats.updated}</text></g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="none" stroke="${t.stroke}"/>
</svg>`;
}

// ---------- project cards ----------
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SH = 250;
// A product screenshot when profile/shots/<id>.jpg exists, otherwise a small terminal panel drawn from the project's term lines.
function shotArt(p) {
  const file = new URL(`./shots/${p.id}.jpg`, import.meta.url);
  if (existsSync(file)) return `<image x="0" y="0" width="580" height="${SH}" preserveAspectRatio="xMidYMid slice" href="data:image/jpeg;base64,${b64(readFileSync(file))}"/>`;
  const lines = (p.term ?? [p.name]).map((l, i) => {
    const cmd = l.startsWith("$");
    return `<text x="40" y="${70 + i * 30}" font-family="${MONO}" font-size="16" fill="${cmd ? "#f4f4f5" : "#a1a1aa"}">${cmd ? `<tspan fill="${p.accent}">$</tspan>${esc(l.slice(1))}` : esc(l)}</text>`;
  });
  return `<rect width="580" height="${SH}" fill="#0c0c11"/><rect width="580" height="${SH}" fill="${p.accent}" fill-opacity="0.07"/>
<circle cx="26" cy="22" r="4.5" fill="#ff5f57"/><circle cx="42" cy="22" r="4.5" fill="#febc2e"/><circle cx="58" cy="22" r="4.5" fill="#28c840"/>
${lines.join("")}`;
}
function card(t, p, stars, month) {
  const H = SH + 150;
  const meta = [`${fmt(stars)} stars`, month > 0 ? `${fmt(month)} npm / month` : null].filter(Boolean);
  let mx = 28;
  const chips = meta
    .map((m) => {
      const w = 22 + m.length * 7.2;
      const g = `<g transform="translate(${mx} ${SH + 104})"><rect width="${w}" height="26" rx="13" fill="${p.accent}" fill-opacity="0.14"/><text x="${w / 2}" y="17.5" font-size="12.5" font-weight="600" text-anchor="middle" fill="${t.text}">${esc(m)}</text></g>`;
      mx += w + 8;
      return g;
    })
    .join("");
  const desc = p.desc.map((l, i) => `<text x="28" y="${SH + 64 + i * 20}" font-size="14.5" fill="${t.sub}">${esc(l)}</text>`).join("");
  const tagW = 20 + p.tag.length * 6.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="580" height="${H}" viewBox="0 0 580 ${H}" font-family="${FONT}">
<defs><clipPath id="c"><rect width="580" height="${H}" rx="20"/></clipPath>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.8" stop-color="${t.card}" stop-opacity="0"/><stop offset="1" stop-color="${t.card}"/></linearGradient>
<linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0.2"/></linearGradient></defs>
<g clip-path="url(#c)">
<rect width="580" height="${H}" fill="${t.card}"/>
${shotArt(p)}
<rect width="580" height="${SH}" fill="url(#fade)"/>
<rect x="28" y="0" width="64" height="4" rx="2" fill="url(#a)"/>
<text x="28" y="${SH + 32}" font-size="22" font-weight="800" fill="${t.text}">${esc(p.name)}</text>
<g transform="translate(552 ${SH + 17})"><rect x="-${tagW}" y="-14" width="${tagW}" height="24" rx="12" fill="${t.card}" stroke="${t.stroke}"/><text x="-${tagW / 2}" y="2.5" font-size="11.5" font-weight="600" text-anchor="middle" fill="${t.dim}">${esc(p.tag.toUpperCase())}</text></g>
${desc}
${chips}
${dotGlow("cg", [{ cx: 70, cy: H + 5, rx: 280, ry: 140, color: p.accent, a: 0.5 }, { cx: 540, cy: H - 5, rx: 230, ry: 120, color: p.accent, a: 0.32 }], 0.4, 1)}
<text x="552" y="${SH + 122}" font-size="13" font-weight="600" text-anchor="end" fill="${t === THEMES.light ? darken(p.accent, 0.4) : p.accent}">${esc(p.url.replace(/^https:\/\/(www\.)?/, ""))}  →</text>
</g>
<rect x="0.5" y="0.5" width="579" height="${H - 1}" rx="20" fill="none" stroke="${t.stroke}"/>
</svg>`;
}

mkdirSync(OUT, { recursive: true });
for (const [mode, t] of Object.entries(THEMES)) {
  if (mode === "light" && process.env.PROFILE_LIGHT !== "1") continue;
  const put = (name, svg) => writeFileSync(join(OUT, name), withFont(svg));
  put(`hero-${mode}.svg`, hero(t));
  put(`hero-mobile-${mode}.svg`, heroMobile(t));
  put(`stats-${mode}.svg`, panel(t));
  put(`stats-mobile-${mode}.svg`, panelMobile(t));
  PROJECTS.forEach((p, i) => put(`card-${p.id}-${mode}.svg`, card(t, p, repoStars[i] ?? 0, sum(p.npm, "month"))));
}
writeFileSync(join(OUT, "stats.json"), `${JSON.stringify({ ...stats, projects: PROJECTS.map((p, i) => ({ id: p.id, stars: repoStars[i], month: sum(p.npm, "month") })) }, null, 2)}\n`);
console.log("stats", stats);
