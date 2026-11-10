#!/usr/bin/env node
/**
 * Public-content guardrail: scans the static export for things the public
 * site must never show, and exits 1 with file, line and match for each hit.
 *
 *   - phone numbers (international `+…` and US/NANP formats)
 *   - `tel:` / `sms:` links and Signal links
 *   - personal email: any `mailto:` and any address at a consumer mail domain
 *   - a link to the GitHub repo of a featured project marked private
 *
 * Rules: README.md "Public content rules", from llevintza/llevintza CLAUDE.md.
 *
 * Usage: node scripts/check-public-content.mjs [outDir]   (default: out/)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = "llevintza";
const SCANNED_EXTENSIONS = new Set([".html", ".xml", ".txt"]);

// Consumer mail providers. Work or custom domains are only caught via mailto:.
const CONSUMER_MAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "yahoo.com",
  "ymail.com",
  "aol.com",
  "proton.me",
  "pm.me",
  "protonmail.com",
  "protonmail.ch",
  "gmx.com",
  "gmx.net",
  "yandex.com",
  "zoho.com",
  "mail.com",
  "fastmail.com",
  "hey.com",
  "tutanota.com",
  "tuta.io",
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// `@`, also URL- or HTML-encoded.
const AT = String.raw`(?:@|%40|&#0*64;|&#x0*40;)`;
const EMAIL_RE = new RegExp(
  String.raw`[a-z0-9._%+-]+${AT}(?:${CONSUMER_MAIL_DOMAINS.map(escapeRe).join("|")}|yahoo\.[a-z]{2,3}(?:\.[a-z]{2})?)(?![a-z0-9-])`,
  "gi",
);

// `+`, then digits and separators; validated in `accept` below. The
// lookbehind skips `1e+21` and `a+1…`; `\+\d` skips `calc(100% + 32px)`.
const INTL_PHONE_RE = /(?<![\w+])\+\d[\d .()-]{6,22}\d(?!\w)/g;
// NANP: area code and exchange start with 2-9, so dates, years, versions,
// `5,000/s` and 10-digit Unix timestamps (17…/18…) don't match.
const US_PHONE_RE =
  /(?<![\w/:+-]|\d[.,])(?:\(\s*[2-9]\d{2}\s*\)\s?|[2-9]\d{2}[ .-]?)[2-9]\d{2}[ .-]?\d{4}(?![\w/:-]|[.,]\d)/g;

const RULES = [
  {
    id: "tel-sms-link",
    // In an href (HTML attribute or JSON payload), or followed by a number.
    re: /(?<=["'=]\s*)(?:tel|sms):[^"'\s<>\\]*|\b(?:tel|sms):\/{0,2}\s*\+?[\d(][\d\s().-]*/gi,
  },
  { id: "signal-link", re: /\b(?:signal\.me|signal\.group|sgnl\.link)\b/gi },
  { id: "mailto-link", re: /\bmailto:/gi },
  { id: "personal-email", re: EMAIL_RE },
  {
    id: "phone-number",
    re: INTL_PHONE_RE,
    accept: (m) => {
      const digits = m.replace(/\D/g, "").length;
      // E.164 length, and separators that read like a number, not a range.
      return digits >= 8 && digits <= 15 && !/[ .-]{2}|\(\(|\)\)/.test(m);
    },
  },
  { id: "phone-number", re: US_PHONE_RE },
];

/** Private-repo link rule for the given repo names (none when empty). */
export function privateRepoRule(names) {
  if (names.length === 0) return null;
  const alt = names.map(escapeRe).join("|");
  return {
    id: "private-repo-link",
    re: new RegExp(
      String.raw`github\.com(?:/|%2F|\\/)${OWNER}(?:/|%2F|\\/)(?:${alt})(?![\w-]|\.(?!git\b)\w)`,
      "gi",
    ),
  };
}

/**
 * Scan one file's text. Returns [{ rule, line, column, match }].
 * @param {string} text
 * @param {{ privateRepos?: string[] }} [options]
 */
export function scanText(text, { privateRepos = [] } = {}) {
  const rules = [...RULES];
  const repoRule = privateRepoRule(privateRepos);
  if (repoRule) rules.push(repoRule);

  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, i) => {
    for (const rule of rules) {
      rule.re.lastIndex = 0;
      for (const m of lineText.matchAll(rule.re)) {
        if (rule.accept && !rule.accept(m[0])) continue;
        findings.push({
          rule: rule.id,
          line: i + 1,
          column: m.index + 1,
          match: m[0].trim(),
        });
      }
    }
  });
  return findings;
}

/** Names of featured projects marked private in web/content/featured.ts. */
export function privateReposFromTs(source) {
  // Walk innermost `{ … }` blocks: each featured entry is one object literal.
  const names = [];
  const stack = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "{") stack.push(i);
    else if (source[i] === "}" && stack.length) {
      const block = source.slice(stack.pop(), i + 1);
      if (block.slice(1).includes("{")) continue;
      if (!/\baccess\s*:\s*["'`]private["'`]/.test(block)) continue;
      const name = block.match(/\bname\s*:\s*["'`]([^"'`]+)["'`]/);
      if (name) names.push(name[1]);
    }
  }
  return names;
}

/** Names of featured projects marked private in _data/featured.yml. */
export function privateReposFromYaml(source) {
  const names = [];
  for (const entry of source.split(/^-\s+/m).slice(1)) {
    const isPrivate =
      /^\s*private\s*:\s*true\s*$/im.test(entry) ||
      /^\s*access\s*:\s*["']?private["']?\s*$/im.test(entry);
    const name = entry.match(/^(?:\s*)name\s*:\s*["']?([^"'\s#]+)/m);
    if (isPrivate && name) names.push(name[1]);
  }
  return names;
}

/**
 * Private featured repo names: web/content/featured.ts if present, otherwise
 * the Jekyll site's _data/featured.yml.
 */
export function loadPrivateRepos(webDir) {
  const ts = path.join(webDir, "content", "featured.ts");
  if (existsSync(ts)) {
    return { source: ts, names: privateReposFromTs(readFileSync(ts, "utf8")) };
  }
  const yml = path.join(webDir, "..", "_data", "featured.yml");
  if (existsSync(yml)) {
    return {
      source: yml,
      names: privateReposFromYaml(readFileSync(yml, "utf8")),
    };
  }
  return { source: null, names: [] };
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (SCANNED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

/** Scan every .html/.xml/.txt file under outDir. */
export function checkDir(outDir, { privateRepos = [] } = {}) {
  const files = [...walk(outDir)].sort();
  const findings = [];
  for (const file of files) {
    for (const f of scanText(readFileSync(file, "utf8"), { privateRepos })) {
      findings.push({ file, ...f });
    }
  }
  return { files, findings };
}

function main() {
  const webDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const outDir = path.resolve(process.argv[2] ?? path.join(webDir, "out"));
  if (!existsSync(outDir) || !statSync(outDir).isDirectory()) {
    console.error(
      `check-public-content: ${outDir} not found; run pnpm build first.`,
    );
    process.exit(2);
  }

  const { source, names } = loadPrivateRepos(webDir);
  console.log(
    source
      ? `Private featured repos (${path.relative(process.cwd(), source)}): ${names.join(", ") || "none"}`
      : "No featured-projects file found; skipping the private-repo link rule.",
  );

  const { files, findings } = checkDir(outDir, { privateRepos: names });
  if (files.length === 0) {
    console.error(
      `check-public-content: no .html/.xml/.txt files under ${outDir}.`,
    );
    process.exit(2);
  }
  for (const f of findings) {
    const where = `${path.relative(process.cwd(), f.file)}:${f.line}:${f.column}`;
    const match =
      f.match.length > 120 ? `${f.match.slice(0, 117)}...` : f.match;
    console.error(`${where}  ${f.rule}  ${JSON.stringify(match)}`);
  }
  if (findings.length) {
    console.error(
      `\n${findings.length} public-content violation(s) in ${files.length} files. See "Public content rules" in README.md.`,
    );
    process.exit(1);
  }
  console.log(`Public content OK: ${files.length} files scanned.`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
