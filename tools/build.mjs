// Static build: copies only what a visitor needs into dist/, then refuses if the blocklist hits.
import { cpSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/demos", { recursive: true });
for (const demo of ["rules-wrapper", "restrictions-editor"]) {
  mkdirSync(`dist/demos/${demo}/src`, { recursive: true });
  for (const f of ["index.html", "styles.css"]) cpSync(`demos/${demo}/${f}`, `dist/demos/${demo}/${f}`);
  cpSync(`demos/${demo}/src`, `dist/demos/${demo}/src`, { recursive: true });
}
writeFileSync("dist/index.html", `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Demos | Megan Casebier</title><meta http-equiv="refresh" content="0; url=/demos/rules-wrapper/"></head><body><p><a href="/demos/rules-wrapper/">The rules wrapper</a></p><p><a href="/demos/restrictions-editor/">The restrictions editor</a></p></body></html>\n`);
writeFileSync("dist/robots.txt", "User-agent: *\nDisallow: /\n");
execFileSync("node", ["../tools/blocklist.mjs"], { cwd: "dist", stdio: "inherit" });
console.log("built dist/");
