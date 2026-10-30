// The brief's blocklist, enforced on file contents, file paths and commit messages.
// Words are stored base64-encoded so this checker never contains them itself.
// Usage: node tools/blocklist.mjs            (scan the working tree)
//        node tools/blocklist.mjs --msg FILE (scan a commit message)
//        node tools/blocklist.mjs --history  (scan every blob, path, message and identity in git history)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const ENCODED = ["aGF6YXJkaHVi","aGF6YXJkIGh1Yg==","aXBn","YWxhY3JpdHk=","ZWxhY2FyaXR5","YW5pY28=","Z29ydWxlcw==","Z28gcnVsZXM=","amRt","Y2x1ZQ==","bXNp","aGFkcm9u","dHJhbnN2ZXJzZQ==","c3Bpbm5ha2Vy","c3RhcnN0b25l","c3RhcnRzdG9uZQ==","ZXZhbnN0b24=","bWFya2Vs","bWFya2VsbA==","aHNpYw==","Zm9ydGlmeQ==","aGFsbw==","b2JpZQ=="];
const words = ENCODED.map((b) => Buffer.from(b, "base64").toString());
// Spaces, hyphens and underscores count as the same gap; whole words only, so a blocked word never matches inside a longer one.
const patterns = words.map((w) => new RegExp("(^|[^a-z0-9])" + w.replace(/ /g, "[ _-]?") + "([^a-z0-9]|$)", "i"));
// The employer's name may appear only in the factual provenance line, which carries this marker.
const FOOTER_OK = /data-provenance/;
const employer = words[words.length - 1];

const SKIP = new Set([".git", "node_modules", "site-assets-part9", ".netlify", ".vercel"]);
const BINARY = /\.(png|jpe?g|webp|gif|mp4|webm|woff2?|ico)$/i;

function hits(text, where) {
  const out = [];
  text.split("\n").forEach((line, i) => {
    patterns.forEach((re, k) => {
      if (!re.test(line)) return;
      if (words[k] === employer && FOOTER_OK.test(line)) return;
      out.push(`${where}:${i + 1}: blocked word #${k + 1}`);
    });
  });
  return out;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}

// The repo is public, so every author and committer must be the GitHub noreply address.
const IDENTITY = /^\d+\+MeganCasebier@users\.noreply\.github\.com$/;
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });

let problems = [];
const i = process.argv.indexOf("--msg");
if (process.argv.includes("--history")) {
  for (const line of git("log", "--all", "--format=%h%x00%ae%x00%ce").trim().split("\n")) {
    const [h, ae, ce] = line.split("\0");
    if (!IDENTITY.test(ae) || !IDENTITY.test(ce)) problems.push(`commit ${h}: identity is not the noreply address`);
  }
  for (const h of git("rev-list", "--all").trim().split("\n")) problems.push(...hits(git("log", "-1", "--format=%B", h), "message " + h.slice(0, 7)));
  for (const line of git("rev-list", "--all", "--objects").trim().split("\n")) {
    const [sha, path] = line.split(" ");
    if (path) problems.push(...hits(path, "path " + path));
    if (git("cat-file", "-t", sha).trim() !== "blob" || BINARY.test(path || "")) continue;
    problems.push(...hits(git("cat-file", "-p", sha), `${path} @${sha.slice(0, 7)}`));
  }
} else if (i > -1) {
  problems = hits(readFileSync(process.argv[i + 1], "utf8"), "commit message");
} else {
  const root = process.cwd();
  for (const f of walk(root)) {
    const rel = relative(root, f);
    problems.push(...hits(rel, "path " + rel));
    if (!BINARY.test(f)) problems.push(...hits(readFileSync(f, "utf8"), rel));
  }
}
if (problems.length) { console.error("BLOCKLIST: refused\n  " + problems.join("\n  ")); process.exit(1); }
console.log("blocklist: clean");
