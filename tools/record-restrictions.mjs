// Scripted 15-20 second loop of the restrictions editor, for its chapter figure. Same pipeline as
// record.mjs: screencast frames with timestamps, a recording-only cursor, then encode.mjs.
// Usage: node tools/record-restrictions.mjs <url> <out-dir>
import { open, sleep } from "./cdp.mjs";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const [url = "http://localhost:8898/demos/restrictions-editor/", dir = "recording/restrictions"] = process.argv.slice(2);
rmSync(dir, { recursive: true, force: true }); mkdirSync(join(dir, "frames"), { recursive: true });

const b = await open(url, { width: 1920, height: 1080, scale: 1 });
for (let i = 0; i < 50 && !(await b.ev(`!!document.querySelector(".shell")`)); i++) await sleep(100);
// The editor is 1040px wide; zoom it to fill a 1080p frame. The screencast ignores device scale, so
// zoom is what keeps the text sharp. Recording-only, like the cursor.
await b.ev(`(() => {
  document.documentElement.style.zoom = 1.5;
  scrollTo(0, document.querySelector(".shell").getBoundingClientRect().top + scrollY - 12);
  const c = document.createElement("div");
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14 8.2-6.2 1.4L7.4 18z" fill="#1A1A18" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: "fixed", left: "800px", top: "400px", zIndex: 99999, pointerEvents: "none", transition: "transform 120ms ease", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))" });
  document.body.appendChild(c);
  const ring = document.createElement("div");
  Object.assign(ring.style, { position: "fixed", width: "22px", height: "22px", marginLeft: "-11px", marginTop: "-11px", borderRadius: "50%", border: "2px solid rgba(26,26,24,.35)", zIndex: 99998, pointerEvents: "none", opacity: 0, transform: "scale(.4)" });
  document.body.appendChild(ring);
  // Events arrive in viewport pixels, but fixed elements inside the zoomed page are placed in zoomed ones.
  addEventListener("mousemove", (e) => { c.style.left = e.clientX / 1.5 - 3 + "px"; c.style.top = e.clientY / 1.5 - 2 + "px"; }, true);
  addEventListener("mousedown", (e) => { c.style.transform = "scale(.86)"; ring.style.left = e.clientX / 1.5 + "px"; ring.style.top = e.clientY / 1.5 + "px"; ring.style.transition = "none"; ring.style.opacity = 1; ring.style.transform = "scale(.4)"; requestAnimationFrame(() => { ring.style.transition = "opacity 380ms ease, transform 380ms ease"; ring.style.opacity = 0; ring.style.transform = "scale(1.4)"; }); }, true);
  addEventListener("mouseup", () => { c.style.transform = ""; }, true);
})()`);
await sleep(300);

const frames = [];
b.listeners.set("Page.screencastFrame", async (p) => {
  const file = join(dir, "frames", String(frames.length).padStart(5, "0") + ".jpg");
  writeFileSync(file, Buffer.from(p.data, "base64"));
  frames.push({ file, t: p.metadata.timestamp });
  b.send("Page.screencastFrameAck", { sessionId: p.sessionId });
});
await b.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

const hold = sleep;
// Element boxes already come back in viewport pixels under the zoom, which is what input events take.
const at = async (sel) => b.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const point = async (sel, ms = 650) => { const p = await at(sel); await b.moveTo(p.x, p.y, ms); return p; };
const press = async (sel, ms = 650) => { const p = await point(sel, ms); await hold(140); await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await hold(80); await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); };

// 0. The editor, Florida in hand.
await hold(1000);
// 1. Change the state in hand: the count and every checkbox now speak about Texas.
await point('[data-action="state"]', 800); await hold(200);
await b.ev(`(()=>{const s=document.querySelector('[data-action="state"]'); s.value="TX"; s.dispatchEvent(new Event("change",{bubbles:true}))})()`); await hold(1200);
// 2. Select a whole aggregator for Texas.
await press('[data-action="group-all"][data-id="north"]', 800); await hold(1400);
// 3. Take one partner back out.
await press('[data-action="toggle"][data-id="AN-03"]', 700); await hold(1100);
// 4. Save.
await press('[data-action="save"]', 900); await hold(1500);
// 5. Read back what's in effect, by state.
await press('[data-action="summary"]', 900); await hold(900);
await press('[data-view="state"]', 700); await hold(2600);
await b.key("Escape"); await hold(600);

await b.send("Page.stopScreencast"); await hold(300);
writeFileSync(join(dir, "frames.json"), JSON.stringify(frames));
console.log(`${frames.length} frames over ${(frames.at(-1).t - frames[0].t).toFixed(1)}s; script errors: ${b.errors.length}`);
b.close();
