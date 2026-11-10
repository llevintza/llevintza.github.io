// Run: pnpm test:public-content  (node:test, no extra dependencies)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkDir,
  loadPrivateRepos,
  privateReposFromTs,
  privateReposFromYaml,
  scanText,
} from "../check-public-content.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, "..", "__fixtures__", "public-content");
const webDir = path.join(here, "..", "..");
const privateRepos = ["secret-project"];

const rulesIn = (text) => scanText(text, { privateRepos }).map((f) => f.rule);
const fixture = (rel) => readFileSync(path.join(fixtures, rel), "utf8");

describe("phone numbers", () => {
  for (const sample of [
    "+44 20 7946 0958",
    "+14155552671",
    "+1 (415) 555-2671",
    "+40 721 234 567",
    "+40.721.234.567",
    "(415) 555-2671",
    "415-555-2671",
    "415.555.2671",
    "415 555 2671",
    "4155552671",
    "Call 415-555-2671.",
  ]) {
    it(`flags ${sample}`, () => {
      assert.ok(rulesIn(`<p>${sample}</p>`).includes("phone-number"));
    });
  }

  for (const sample of [
    "2026-11-09",
    "2026-11-09T12:34:56.789Z",
    "2026-11-09T08:00:00+02:00",
    "11/09/2026",
    "09.11.2026",
    "2014-2026",
    "16.4.5",
    "1.2.3.4567",
    "10.200.3000",
    "5,000/s",
    "1,234,567",
    "12,345,678 events/day",
    "1762691696",
    "1762691696123",
    "0123456789",
    "1234.5678",
    "0.4155552671",
    "calc(100% + 32px)",
    "1e+21",
    "+15%",
    "+5 minutes",
  ]) {
    it(`ignores ${sample}`, () => {
      assert.deepEqual(rulesIn(`<p>${sample}</p>`), []);
    });
  }
});

describe("links and email", () => {
  it("flags tel: and sms: hrefs, including JSON payloads", () => {
    assert.ok(
      rulesIn('<a href="tel:+14155552671">x</a>').includes("tel-sms-link"),
    );
    assert.ok(
      rulesIn("<a href='sms:4155552671'>x</a>").includes("tel-sms-link"),
    );
    assert.ok(rulesIn('<a href="TEL:x">x</a>').includes("tel-sms-link"));
    assert.ok(rulesIn('{"href":"tel:+1"}').includes("tel-sms-link"));
    assert.ok(rulesIn('{\\"href\\":\\"sms:+1\\"}').includes("tel-sms-link"));
  });

  it("ignores prose that merely contains tel/sms", () => {
    assert.deepEqual(
      rulesIn("<p>the hotel: near; sms delivery; intel: none</p>"),
      [],
    );
  });

  it("flags Signal links", () => {
    for (const url of [
      "https://signal.me/#p/x",
      "signal.group/#x",
      "https://sgnl.link/x",
    ]) {
      assert.ok(rulesIn(url).includes("signal-link"), url);
    }
  });

  it("flags any mailto: and consumer-domain addresses, encoded too", () => {
    assert.ok(
      rulesIn('<a href="mailto:hello@example.com">x</a>').includes(
        "mailto-link",
      ),
    );
    for (const addr of [
      "someone@gmail.com",
      "Some.One+tag@Outlook.com",
      "someone@icloud.com",
      "someone@yahoo.com",
      "someone@yahoo.co.uk",
      "someone@proton.me",
      "someone%40gmail.com",
      "someone&#64;gmail.com",
      "someone&#x40;gmail.com",
    ]) {
      assert.ok(rulesIn(`<p>${addr}</p>`).includes("personal-email"), addr);
    }
  });

  it("ignores non-consumer addresses outside mailto:", () => {
    assert.deepEqual(
      rulesIn("<p>hello@example.com, x@gmail.company.dev</p>"),
      [],
    );
  });
});

describe("private repo links", () => {
  for (const url of [
    "https://github.com/llevintza/secret-project",
    "https://github.com/llevintza/secret-project/",
    "https://GitHub.com/LLevintza/Secret-Project/tree/main",
    "git@github.com/llevintza/secret-project.git",
    "https:\\/\\/github.com\\/llevintza\\/secret-project",
  ]) {
    it(`flags ${url}`, () => {
      assert.ok(
        rulesIn(`<a href="${url}">x</a>`).includes("private-repo-link"),
      );
    });
  }

  for (const url of [
    "https://github.com/llevintza/secret-project-client",
    "https://github.com/llevintza/public-thing",
    "https://llevintza.github.io/secret-project/",
    "https://github.com/someone-else/secret-project",
  ]) {
    it(`ignores ${url}`, () => {
      assert.deepEqual(rulesIn(`<a href="${url}">x</a>`), []);
    });
  }

  it("has no repo rule without private names", () => {
    assert.deepEqual(
      scanText("https://github.com/llevintza/secret-project"),
      [],
    );
  });
});

describe("private repo sources", () => {
  it('reads access: "private" entries from featured.ts', () => {
    const source = `
      export interface PrivateFeaturedProject { access: "private"; name: string }
      export const featuredProjects = [
        { name: "secret-project", access: "private", stack: [".NET 10"] },
        { access: 'private', liveUrl: "https://x.test/", name: 'other-secret' },
        { name: "public-thing", access: "public", repoUrl: "https://github.com/llevintza/public-thing" },
      ];`;
    assert.deepEqual(privateReposFromTs(source), [
      "secret-project",
      "other-secret",
    ]);
  });

  it("reads private: true / access: private entries from featured.yml", () => {
    const source = [
      "# comment",
      "- name: secret-project",
      "  private: true",
      "  access: On request",
      "- name: other-secret",
      "  access: private",
      "- name: public-thing",
      '  repo: "https://github.com/llevintza/public-thing"',
      "  access: Public",
    ].join("\n");
    assert.deepEqual(privateReposFromYaml(source), [
      "secret-project",
      "other-secret",
    ]);
  });

  it("finds this repo's featured-projects file", () => {
    // Content-agnostic: projects may go public or private over time.
    const { source, names } = loadPrivateRepos(webDir);
    assert.ok(source, "expected web/content/featured.ts or _data/featured.yml");
    assert.ok(Array.isArray(names));
    const text = readFileSync(source, "utf8");
    for (const name of names) assert.ok(text.includes(name), name);
  });
});

describe("fixtures", () => {
  it("passes the clean fixture", () => {
    const { files, findings } = checkDir(path.join(fixtures, "pass"), {
      privateRepos,
    });
    assert.equal(files.length, 1);
    assert.deepEqual(findings, []);
  });

  const expected = {
    "phone-intl.html": { "phone-number": 3 },
    "phone-us.html": { "phone-number": 4 },
    "tel-link.html": { "tel-sms-link": 2 },
    "signal-link.html": { "signal-link": 3 },
    "email.html": { "mailto-link": 1, "personal-email": 4 },
    "private-repo.html": { "private-repo-link": 1 },
    "rsc-payload.txt": { "tel-sms-link": 1, "private-repo-link": 1 },
    "sitemap.xml": { "private-repo-link": 1 },
  };

  for (const [file, counts] of Object.entries(expected)) {
    it(`fails ${file} with file, line and match`, () => {
      const findings = scanText(fixture(`fail/${file}`), { privateRepos });
      const got = {};
      for (const f of findings) {
        // Phone digits inside a tel:/sms: href are reported by that rule.
        if (f.rule === "phone-number" && counts["phone-number"] === undefined)
          continue;
        got[f.rule] = (got[f.rule] ?? 0) + 1;
        assert.ok(f.line >= 1 && f.match.length > 0);
      }
      assert.deepEqual(got, counts);
    });
  }

  it("reports every failing fixture file from the directory walk", () => {
    const { files, findings } = checkDir(path.join(fixtures, "fail"), {
      privateRepos,
    });
    assert.equal(files.length, Object.keys(expected).length);
    const flagged = new Set(findings.map((f) => path.basename(f.file)));
    assert.deepEqual([...flagged].sort(), Object.keys(expected).sort());
  });
});
