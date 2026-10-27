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

// DEV.to (Forem) has no public way to read another account's follower
// count, not the profile page, not any unauthenticated endpoint: only
// /api/followers/users, which requires the account owner's own API key
// (Settings > Extensions > DEV API Keys on dev.to). Returns null (the
// stat is simply omitted from the README, see the STATS line below)
// rather than a stale guessed number when that key isn't configured.
//
// The endpoint returns a plain JSON array with no total-count response
// header (confirmed against Forem's own OpenAPI spec), so getting an
// accurate count means paging through every follower and counting them,
// the same pattern starsFor() already uses for GitHub repos.
async function devFollowers() {
  if (!process.env.DEV_API_KEY) return null;
  const headers = {
    "User-Agent": "thegdsks-stats-bot",
    "api-key": process.env.DEV_API_KEY,
    Accept: "application/vnd.forem.api-v1+json",
  };
  let total = 0;
  let page = 1;
  const perPage = 1000;
  while (true) {
    const r = await fetch(
      `https://dev.to/api/followers/users?page=${page}&per_page=${perPage}&sort=-created_at`,
      { headers }
    );
    if (!r.ok) {
      console.warn(`DEV.to followers page ${page}: ${r.status} ${await r.text()}`);
      return total > 0 ? total : null;
    }
    const batch = await r.json();
    total += batch.length;
    if (batch.length < perPage) break;
    page++;
  }
  return total;
}

const RSS_FEEDS = ["https://levelrail.com/blog/rss.xml"];

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
async function latestWriting(limit = 6) {
  const feeds = (await Promise.all(RSS_FEEDS.map(rssItems))).flat();
  const canonical = new Set(feeds.map((f) => f.url.replace(/\/$/, "")));
  let dev = [];
  try {
    const r = await fetch(`https://dev.to/api/articles?username=${DEV_USER}&per_page=15`, {
      headers: { "User-Agent": "thegdsks-stats-bot" },
    });
    if (r.ok) {
      dev = (await r.json())
        .filter((a) => !canonical.has((a.canonical_url ?? "").replace(/\/$/, "")))
        .map((a) => ({ title: a.title, url: a.url, time: Date.parse(a.published_timestamp) || 0 }));
    }
  } catch {
    dev = [];
  }
  const all = [...feeds, ...dev].filter((a) => a.title && a.url).sort((a, b) => b.time - a.time);
  return all.slice(0, limit).map((a) => ({ ...a, date: shortDate(a.time) }));
}

const RELEASE_REPOS = [
  "glincker/levelrail",
  "glincker/thesvg",
  "glincker/theauth",
  "glincker/stacklit",
  "glincker/sslx",
  "glincker/glinui",
  "glincker/featuredrop",
  "thegdsks/awesome-modern-cli",
];

async function recentReleases(limit = 6) {
  const lists = await Promise.all(
    RELEASE_REPOS.map(async (repo) => {
      try {
        const rels = await gh(`/repos/${repo}/releases?per_page=3`);
        return rels
          .filter((r) => !r.draft && !r.prerelease)
          .map((r) => ({
            name: `${repo.split("/")[1]} ${r.tag_name.replace(/^.*@/, "")}`,
            url: r.html_url,
            time: Date.parse(r.published_at) || 0,
          }));
      } catch {
        return [];
      }
    })
  );
  return lists
    .flat()
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)
    .map((r) => ({ ...r, date: shortDate(r.time) }));
}

function roundDown(n, step) {
  return Math.floor(n / step) * step;
}

function fmt(n) {
  if (n == null) return null;
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
const dev = await devFollowers();
const articles = await latestWriting();
const releases = await recentReleases();

const parts = [
  `\`${fmt(stars)} GitHub stars\``,
  `\`${fmt(npm.downloads)} monthly npm downloads\``,
  `\`${npm.count}+ packages\``,
  dev != null ? `\`${fmt(dev)} DEV.to followers\`` : null,
].filter(Boolean);

let readme = readFileSync("README.md", "utf8");
readme = replaceBlock(readme, "STATS", parts.join(" | "));

if (articles && articles.length) {
  const body = articles.map((a) => `- [${a.title}](${a.url}) (${a.date})`).join("\n");
  readme = replaceBlock(readme, "WRITING", body);
}

if (releases.length) {
  const body = releases.map((r) => `- [${r.name}](${r.url}) (${r.date})`).join("\n");
  readme = replaceBlock(readme, "RELEASES", body);
}

readme = replaceBlock(readme, "PACKAGES", topPackagesTable(npm.pkgs));

const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
readme = readme.replace(/\?v=METRICS_CACHE_BUST/g, `?v=${today}`);
readme = readme.replace(/(general_[LR]\.svg)\?v=\d{8}/g, `$1?v=${today}`);

writeFileSync("README.md", readme);

console.log("stats:", { stars, npm, dev });
console.log("articles:", articles?.length ?? 0);
