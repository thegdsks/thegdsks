#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const GH_USER = "thegdsks";
const ORGS = ["glincker"];
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
  thesvg: "5,600+ brand SVG icons",
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
  await Promise.all(
    pkgs.map(async (p) => {
      try {
        const d = await fetch(
          `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(p.name)}`,
          { headers: { "User-Agent": "thegdsks-stats-bot" } }
        );
        if (!d.ok) return;
        const j = await d.json();
        p.downloads = typeof j.downloads === "number" ? j.downloads : 0;
        downloads += p.downloads;
      } catch {
        p.downloads = 0;
      }
    })
  );
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

async function devFollowers() {
  if (process.env.DEV_API_KEY) {
    try {
      const r = await fetch("https://dev.to/api/followers/users?per_page=1", {
        headers: {
          "User-Agent": "thegdsks-stats-bot",
          "api-key": process.env.DEV_API_KEY,
          Accept: "application/vnd.forem.api-v1+json",
        },
      });
      if (r.ok) {
        const total = r.headers.get("x-total-count") ?? r.headers.get("total");
        if (total) return parseInt(total, 10);
      }
    } catch {
      /* fall through */
    }
  }
  const fallback = parseInt(process.env.DEV_FOLLOWERS_FALLBACK ?? "11800", 10);
  return Number.isFinite(fallback) ? fallback : null;
}

async function devArticles() {
  const r = await fetch(`https://dev.to/api/articles?username=${DEV_USER}&per_page=5`, {
    headers: { "User-Agent": "thegdsks-stats-bot" },
  });
  if (!r.ok) return null;
  const list = await r.json();
  return list.map((a) => ({ title: a.title, url: a.url, date: a.readable_publish_date }));
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

const [userStars, ...orgStarsArr] = await Promise.all([
  starsFor(GH_USER, "users"),
  ...ORGS.map((o) => starsFor(o, "orgs")),
]);
const stars = userStars + orgStarsArr.reduce((a, b) => a + b, 0);

const npm = await npmStats();
const dev = await devFollowers();
const articles = await devArticles();

const parts = [
  `\`${fmt(stars)} GitHub stars\``,
  `\`${fmt(npm.downloads)} monthly npm downloads\``,
  `\`${npm.count}+ packages\``,
  dev != null ? `\`${fmt(dev)} DEV.to followers\`` : null,
].filter(Boolean);

let readme = readFileSync("README.md", "utf8");
readme = replaceBlock(readme, "STATS", parts.join(" | "));

if (articles && articles.length) {
  const body = articles.map((a) => `- [${a.title}](${a.url}) — ${a.date}`).join("\n");
  readme = replaceBlock(readme, "ARTICLES", body);
}

readme = replaceBlock(readme, "PACKAGES", topPackagesTable(npm.pkgs));

const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
readme = readme.replace(/\?v=METRICS_CACHE_BUST/g, `?v=${today}`);
readme = readme.replace(/(general_[LR]\.svg)\?v=\d{8}/g, `$1?v=${today}`);

writeFileSync("README.md", readme);

console.log("stats:", { stars, npm, dev });
console.log("articles:", articles?.length ?? 0);
