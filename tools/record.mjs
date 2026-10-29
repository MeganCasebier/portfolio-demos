// Scripted screen recording of Demo 1. Captures screencast frames with their timestamps; encode.mjs
// turns them into an MP4 with ffmpeg. Headless Chrome draws no pointer, so a recording-only cursor
// is injected here; it never ships with the demo.
// Usage: node tools/record.mjs <url> <out-dir>
import { open, sleep } from "./cdp.mjs";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const [url = "http://localhost:8898/demos/rules-wrapper/", dir = "recording"] = process.argv.slice(2);
rmSync(dir, { recursive: true, force: true }); mkdirSync(join(dir, "frames"), { recursive: true });

// A native 1920x1080 viewport: the screencast ignores device scale, so this is what keeps text sharp.
const b = await open(url, { width: 1920, height: 1080, scale: 1 });
for (let i = 0; i < 50 && !(await b.ev(`!!document.querySelector(".shell")`)); i++) await sleep(100);
await b.ev(`(() => {
  const c = document.createElement("div");
  c.id = "rec-cursor";
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14 8.2-6.2 1.4L7.4 18z" fill="#1A1A18" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: "fixed", left: "960px", top: "540px", zIndex: 99999, pointerEvents: "none", transition: "transform 120ms ease", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))" });
  document.body.appendChild(c);
  const ring = document.createElement("div");
  Object.assign(ring.style, { position: "fixed", width: "28px", height: "28px", marginLeft: "-11px", marginTop: "-11px", borderRadius: "50%", border: "2px solid rgba(26,26,24,.35)", zIndex: 99998, pointerEvents: "none", opacity: 0, transform: "scale(.4)", transition: "opacity 260ms ease, transform 260ms ease" });
  document.body.appendChild(ring);
  addEventListener("mousemove", (e) => { c.style.left = e.clientX - 3 + "px"; c.style.top = e.clientY - 2 + "px"; }, true);
  addEventListener("mousedown", (e) => { c.style.transform = "scale(.86)"; ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px"; ring.style.transition = "none"; ring.style.opacity = 1; ring.style.transform = "scale(.4)"; requestAnimationFrame(() => { ring.style.transition = "opacity 380ms ease, transform 380ms ease"; ring.style.opacity = 0; ring.style.transform = "scale(1.4)"; }); }, true);
  addEventListener("mouseup", () => { c.style.transform = ""; }, true);
  document.documentElement.style.scrollBehavior = "smooth";
})()`);

const frames = [];
b.listeners.set("Page.screencastFrame", async (p) => {
  const n = frames.length, file = join(dir, "frames", String(n).padStart(5, "0") + ".jpg");
  writeFileSync(file, Buffer.from(p.data, "base64"));
  frames.push({ file, t: p.metadata.timestamp });
  b.send("Page.screencastFrameAck", { sessionId: p.sessionId });
});
await b.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

const hold = sleep;
const scrollTo = async (sel, block = "start", offset = 0) => { await b.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); const y=e.getBoundingClientRect().top+scrollY-${offset}; scrollTo({top:y,behavior:"smooth"})})()`); await hold(900); };
// The driver scrolls targets into view before clicking; keep that gentle by scrolling first.
const at = async (sel) => b.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const point = async (sel, ms = 650) => { const p = await at(sel); await b.moveTo(p.x, p.y, ms); return p; };
const press = async (sel, ms = 650) => { const p = await point(sel, ms); await hold(140); await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await hold(80); await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); };

// 0. The page, then the app.
await hold(1600);
await b.moveTo(1150, 640, 900);
await scrollTo(".shell", "start", 16); await hold(700);
// 1. A read-only cell: the thesis.
await press('.grid tr:nth-child(2) td:nth-child(3) .cell', 900); await hold(2400);
await b.key("Escape"); await hold(300);
// 2. Run reality once.
await press('.panel [data-action="run"]', 900); await hold(1700);
// 3. Cross the border.
await press('[data-action="edit"]', 1000); await hold(1500);
// 4. Change one value; a test flips red.
await press('.cell-in[data-row="0"][data-col="lossCount"]', 800);
await b.ev(`document.querySelector('.cell-in[data-row="0"][data-col="lossCount"]').select()`); await hold(350);
await b.type(">= 3", { cps: 7 }); await hold(800);
await point(".card--fail", 900); await hold(2400);
// The change is intended: accept the new reality as the expectation. Green again.
await press('.card--fail [data-action="accept"]', 800); await hold(1600);
// 5. Review: the record the engine never kept.
await press("#to-review", 900); await hold(900);
await scrollTo(".review", "start", 120); await hold(400);
await press("#f-date", 700);
await b.ev(`(()=>{const d=document.getElementById("f-date"); d.value="2026-11-16"; d.dispatchEvent(new Event("input",{bubbles:true}))})()`); await hold(500);
await press("#f-note", 700); await b.type("Two losses no longer refer on their own.", { cps: 16 }); await hold(500);
await press("#f-approver", 700);
await b.ev(`(()=>{const s=document.getElementById("f-approver"); s.value="Jordan Hale"; s.dispatchEvent(new Event("change",{bubbles:true}))})()`); await hold(800);
await point(".diff", 800); await hold(1400);
await press('[data-action="submit"]', 800); await hold(1500);
// 6. Play the other roles: QA, then the approver.
await scrollTo(".shell", "start", 16); await hold(300);
await press('[data-action="pass-qa"]', 900); await hold(1600);
await press('[data-action="approve"]', 900); await hold(1500);
await press('[data-action="versions"]', 900); await hold(2600);
await b.moveTo(1420, 860, 1000); await hold(1400);

await b.send("Page.stopScreencast"); await hold(300);
writeFileSync(join(dir, "frames.json"), JSON.stringify(frames));
const secs = (frames.at(-1).t - frames[0].t).toFixed(1);
console.log(`${frames.length} frames over ${secs}s; script errors: ${b.errors.length}`);
b.close();
