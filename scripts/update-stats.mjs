#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const GH_USER = "thegdsks";
const NPM_USER = "gdsks";
const DEV_USER = "thegdsks";

const GH_HEADERS = {
  "User-Agent": "thegdsks-stats-bot",
  Accept: "application/vnd.github+json",
  ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
};

async function gh(path) {
  const r = await fetch(`https://api.github.com${path}`, { headers: GH_HEADERS });
  if (!r.ok) throw new Error(`GitHub ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

// Public org memberships only, the same visibility a logged-out visitor
// to github.com/thegdsks sees: a private membership would need the
// authenticated /user/orgs endpoint with a personal token, not the
// repo-scoped GITHUB_TOKEN this workflow runs with. Discovered live so
// joining a new org is picked up automatically, not another hardcoded
// array to remember to update.
async function orgsFor(username) {
  const orgs = await gh(`/users/${username}/orgs`);
  return orgs.map((o) => o.login);
}

async function starsFor(owner, kind) {
  let total = 0;
  let page = 1;
  while (true) {
    const repos = await gh(`/${kind}/${owner}/repos?per_page=100&page=${page}&type=public`);
    if (!repos.length) break;
    for (const r of repos) if (!r.fork && !r.private) total += r.stargazers_count || 0;
    if (repos.length < 100) break;
    page++;
  }
  return total;
}

const PACKAGE_DESCRIPTIONS = {
  "glin-profanity": "Profanity detection, 24+ languages",
  thesvg: "6,500+ brand SVG icons",
  "@thesvg/react": "Typed React components for brand icons",
  "@thesvg/cli": "CLI for fetching brand icons",
  "@thesvg/mcp": "MCP server for brand icons",
};

async function npmStats() {
  const r = await fetch(
    `https://registry.npmjs.org/-/v1/search?text=maintainer:${NPM_USER}&size=250`,
    { headers: { "User-Agent": "thegdsks-stats-bot" } }
  );
  if (!r.ok) throw new Error(`npm search: ${r.status}`);
  const data = await r.json();
  const pkgs = data.objects.map((o) => ({
    name: o.package.name,
    description: o.package.description ?? "",
  }));
  let downloads = 0;
  // npm answers 429 when hit with all packages at once, and a skipped package counted as zero downloads. One at a time,
  // retrying with the wait npm asks for, so the total is the real one.
  for (const p of pkgs) {
    p.downloads = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const d = await fetch(
          `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(p.name)}`,
          { headers: { "User-Agent": "thegdsks-stats-bot" } }
        );
        if (d.status === 429) {
          await new Promise((res) => setTimeout(res, (Number(d.headers.get("retry-after")) || 15) * 1000));
          continue;
        }
        if (!d.ok) break;
        const j = await d.json();
        p.downloads = typeof j.downloads === "number" ? j.downloads : 0;
        break;
      } catch {
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
    downloads += p.downloads;
    await new Promise((res) => setTimeout(res, 250));
  }
  return { count: pkgs.length, downloads, pkgs };
}

function topPackagesTable(pkgs, n = 3) {
  const top = [...pkgs]
    .filter((p) => (p.downloads ?? 0) > 0)
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    .slice(0, n);
  const rows = top.map((p) => {
    const desc = PACKAGE_DESCRIPTIONS[p.name] ?? p.description ?? "";
    const link = `https://www.npmjs.com/package/${p.name}`;
    const badge = `![npm](https://img.shields.io/npm/dm/${encodeURIComponent(p.name)}?label=&color=CB3837)`;
    return `| [${p.name}](${link}) | ${desc} | ${badge} |`;
  });
  return ["| Package | What it does | Downloads/mo |", "|---------|-------------|:------------:|", ...rows].join("\n");
}

// jsDelivr serves theSVG's files from the repo and its npm packages. Hits for the last month, summed over the repo and
// the theSVG npm packages. A target that fails counts as zero, so the number can only be low, never invented.
async function cdnHits(pkgs) {
  const targets = ["gh/glincker/thesvg", ...pkgs.filter((p) => p.name === "thesvg" || p.name.startsWith("@thesvg/")).map((p) => `npm/${p.name}`)];
  let total = 0;
  for (const target of targets) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const r = await fetch(`https://data.jsdelivr.com/v1/stats/packages/${target}?period=month`, { headers: { "User-Agent": "thegdsks-stats-bot" } });
        if (r.status === 404) break;
        if (!r.ok) throw new Error(String(r.status));
        total += (await r.json()).hits?.total ?? 0;
        break;
      } catch {
        await new Promise((res) => setTimeout(res, 1500));
      }
    }
  }
  return total;
}

const RSS_FEEDS = ["https://levelrail.com/blog/rss.xml", "https://thesvg.org/feed.xml", "https://thegdsks.com/feed.xml"];

function xmlText(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  return m[1]
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

async function rssItems(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "thegdsks-stats-bot" } });
    if (!r.ok) return [];
    const xml = await r.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
      title: xmlText(m[1], "title"),
      url: xmlText(m[1], "link"),
      time: Date.parse(xmlText(m[1], "pubDate")) || 0,
      source: "",
    }));
  } catch {
    return [];
  }
}

function shortDate(ms) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Feed posts are canonical. DEV.to cross-posts carry that URL as canonical_url,
// so they are dropped here and the list shows each post once.
// Sites whose post pages carry no og:image of their own fall back to the site's default social image.
const DEFAULT_COVER = { "thesvg.org": "https://thesvg.org/og-image.png" };

// The cover image of a post is its og:image. A page that cannot be read just gets no image.
async function ogImage(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "thegdsks-stats-bot" }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return "";
    const html = (await r.text()).slice(0, 60000);
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m ? new URL(m[1].replace(/&amp;/g, "&"), url).href : "";
  } catch {
    return "";
  }
}

// One post per source first (DEV, theSVG, Levelrail, thegdsks), newest first, then the rest by date, so one blog that
// publishes a lot cannot fill every slot.
async function latestWriting(limit = 3) {
  const feeds = (await Promise.all(RSS_FEEDS.map(rssItems))).flat().map((f) => ({ ...f, source: new URL(f.url).hostname.replace(/^www\./, "") }));
  const canonical = new Set(feeds.map((f) => f.url.replace(/\/$/, "")));
  let dev = [];
  try {
    const r = await fetch(`https://dev.to/api/articles?username=${DEV_USER}&per_page=15`, {
      headers: { "User-Agent": "thegdsks-stats-bot" },
    });
    if (r.ok) {
      dev = (await r.json())
        .filter((a) => !canonical.has((a.canonical_url ?? "").replace(/\/$/, "")))
        .map((a) => ({ title: a.title, url: a.url, time: Date.parse(a.published_timestamp) || 0, source: "dev.to", image: a.social_image || a.cover_image || "" }));
    }
  } catch {
    dev = [];
  }
  const all = [...feeds, ...dev].filter((a) => a.title && a.url).sort((a, b) => b.time - a.time);
  const picked = [];
  const seen = new Set();
  for (const a of all) {
    if (picked.length >= limit) break;
    if (!seen.has(a.source)) {
      seen.add(a.source);
      picked.push(a);
    }
  }
  for (const a of all) {
    if (picked.length >= limit) break;
    if (!picked.includes(a)) picked.push(a);
  }
  picked.sort((a, b) => b.time - a.time);
  for (const a of picked) if (!a.image) a.image = (await ogImage(a.url)) || DEFAULT_COVER[a.source] || "";
  return picked.map((a) => ({ ...a, date: shortDate(a.time) }));
}

// Cover images in a row, then the titles as a list. Inline images wrap by themselves, so a phone gets one per line, and
// the list keeps every title readable at any width.
function writingCards(articles) {
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const strip = articles
    .filter((a) => a.image)
    .map((a) => `<a href="${esc(a.url)}"><img src="${esc(a.image)}" alt="${esc(a.title)}" width="270" /></a>`)
    .join(" ");
  const list = articles.map((a) => `- [${a.title.replace(/[[\]]/g, "")}](${a.url}) <sub>${a.source} · ${a.date}</sub>`).join("\n");
  return `${strip}\n\n${list}`;
}

const RELEASE_REPOS = [
  "glincker/levelrail",
  "glincker/thesvg",
  "glincker/theauth",
  "glincker/stacklit",
  "glincker/sslx",
  "glincker/glinui",
  "glincker/featuredrop",
  "glincker/glin-profanity",
  "profclaw/profclaw",
  "thegdsks/awesome-modern-cli",
];

// One entry per product, newest first. A repo that ships several packages (theSVG tags every package) would otherwise fill
// the list on its own, so only its main package's release counts, falling back to the newest release.
async function recentReleases(limit = 6) {
  const picks = await Promise.all(
    RELEASE_REPOS.map(async (repo) => {
      try {
        const name = repo.split("/")[1];
        const rels = (await gh(`/repos/${repo}/releases?per_page=15`)).filter((r) => !r.draft && !r.prerelease);
        const main = rels.find((r) => decodeURIComponent(r.tag_name).startsWith(`${name}@`)) ?? rels[0];
        if (!main) return null;
        return {
          name: `${name} ${decodeURIComponent(main.tag_name).replace(/^.*@/, "")}`,
          product: name,
          version: decodeURIComponent(main.tag_name).replace(/^.*@/, ""),
          url: main.html_url,
          time: Date.parse(main.published_at) || 0,
        };
      } catch {
        return null;
      }
    })
  );
  return picks
    .filter(Boolean)
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)
    .map((r) => ({ ...r, date: shortDate(r.time) }));
}

function roundDown(n, step) {
  return Math.floor(n / step) * step;
}

function fmt(n) {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(roundDown(n, 100_000) / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (n >= 10_000) return `${(roundDown(n, 100) / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  if (n >= 1_000) return `${(roundDown(n, 100) / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  return `${roundDown(n, 10)}+`;
}

function replaceBlock(src, marker, body) {
  const re = new RegExp(`<!-- ${marker}:START -->[\\s\\S]*?<!-- ${marker}:END -->`);
  return src.replace(re, `<!-- ${marker}:START -->\n${body}\n<!-- ${marker}:END -->`);
}

const orgLogins = await orgsFor(GH_USER);
const [userStars, ...orgStarsArr] = await Promise.all([
  starsFor(GH_USER, "users"),
  ...orgLogins.map((o) => starsFor(o, "orgs")),
]);
const stars = userStars + orgStarsArr.reduce((a, b) => a + b, 0);

const npm = await npmStats();
const cdn = await cdnHits(npm.pkgs);
const articles = await latestWriting();
const releases = await recentReleases();

const parts = [
  `\`${fmt(stars)} GitHub stars\``,
  `\`${fmt(npm.downloads)} monthly npm downloads\``,
  `\`${npm.count}+ packages\``,
  cdn > 0 ? `\`${fmt(cdn)} monthly jsDelivr hits\`` : null,
].filter(Boolean);

let readme = readFileSync("README.md", "utf8");
readme = replaceBlock(readme, "STATS", parts.join(" | "));

if (articles && articles.length) {
  readme = replaceBlock(readme, "WRITING", writingCards(articles));
}

if (releases.length) {
  // One badge per product with its version, in the product's colour, linked to the release.
  const COLORS = { levelrail: "7C3AED", thesvg: "F97316", theauth: "22D3EE", stacklit: "FACC15", sslx: "94A3B8", glinui: "38BDF8", featuredrop: "34D399", "glin-profanity": "A78BFA", profclaw: "F472B6", "awesome-modern-cli": "FB923C" };
  const NAMES = { levelrail: "Levelrail", thesvg: "theSVG", theauth: "theAuth", profclaw: "profClaw" };
  const sh = (t) => encodeURIComponent(t.replace(/-/g, "--").replace(/_/g, "__"));
  const items = releases.map((r) => {
    const label = NAMES[r.product] ?? r.product;
    const version = /^\d/.test(r.version) ? `v${r.version}` : r.version;
    const badge = `https://img.shields.io/badge/${sh(label)}-${sh(version)}-${COLORS[r.product] ?? "71717A"}?style=for-the-badge&labelColor=18181B`;
    return `<a href="${r.url}"><img src="${badge}" alt="${label} ${version}" /></a>&nbsp;<sub>${r.date}</sub>`;
  });
  readme = replaceBlock(readme, "RELEASES", `<p align="center">\n${items.join("&nbsp;&nbsp;&nbsp;\n")}\n</p>`);
}

readme = replaceBlock(readme, "PACKAGES", topPackagesTable(npm.pkgs));

const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
readme = readme.replace(/\?v=METRICS_CACHE_BUST/g, `?v=${today}`);
readme = readme.replace(/(general_[LR]\.svg)\?v=\d{8}/g, `$1?v=${today}`);

writeFileSync("README.md", readme);

console.log("stats:", { stars, npm: { count: npm.count, downloads: npm.downloads }, cdn });
console.log("articles:", articles?.length ?? 0);
