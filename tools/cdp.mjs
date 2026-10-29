// A tiny headless-Chrome driver over the DevTools protocol, for click-tests and scripted recordings.
// No dependencies: Node's built-in fetch and WebSocket, and the locally installed Chrome.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function open(url, { width = 1440, height = 900, scale = 1, dark = false } = {}) {
  const port = 9300 + (process.pid % 500);
  const proc = spawn(CHROME, ["--headless", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, "--user-data-dir=" + mkdtempSync(join(tmpdir(), "cdp-")), "about:blank"], { stdio: "ignore" });
  let ws;
  for (let i = 0; i < 80 && !ws; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = list.find((t) => t.type === "page"); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {}
    if (!ws) await sleep(150);
  }
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pending = new Map(), listeners = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
    if (m.method && listeners.has(m.method)) listeners.get(m.method)(m.params);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  const errors = [];
  listeners.set("Runtime.exceptionThrown", (p) => errors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text));
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: width < 500 });
  if (dark) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  await send("Page.navigate", { url }); await sleep(1800);

  const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed"); return r.result?.value; };
  const box = async (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:"center"}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2, y:b.y+b.height/2}})()`);
  const mouse = { x: width / 2, y: height / 2 };
  // Human-paced pointer: ease the cursor along a path instead of teleporting.
  async function moveTo(x, y, ms = 420) {
    const sx = mouse.x, sy = mouse.y, steps = Math.max(8, Math.round(ms / 16));
    // A hand doesn't travel in straight lines: bow the path a little, to a random side.
    const dx = x - sx, dy = y - sy, bow = (Math.random() < .5 ? -1 : 1) * (0.06 + Math.random() * 0.06);
    const cx = sx + dx / 2 - dy * bow, cy = sy + dy / 2 + dx * bow;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, k = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      mouse.x = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * cx + k * k * x;
      mouse.y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * cy + k * k * y;
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: mouse.x, y: mouse.y });
      await sleep(16);
    }
  }
  async function click(sel, { ms = 420 } = {}) {
    const b = await box(sel); if (!b) throw new Error("not found: " + sel);
    await sleep(120); await moveTo(b.x, b.y, ms);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: b.x, y: b.y, button: "left", clickCount: 1 });
    await sleep(70);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: b.x, y: b.y, button: "left", clickCount: 1 });
  }
  async function type(text, { cps = 11 } = {}) {
    for (const ch of text) { await send("Input.insertText", { text: ch }); await sleep(1000 / cps + Math.random() * 40); }
  }
  async function key(k) {
    const map = { Backspace: 8, Escape: 27, Tab: 9, Enter: 13 };
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, windowsVirtualKeyCode: map[k] });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, windowsVirtualKeyCode: map[k] });
  }
  async function shot() { const { data } = await send("Page.captureScreenshot", { format: "png" }); return Buffer.from(data, "base64"); }
  const close = () => { try { ws.close(); } catch {} proc.kill(); };
  return { send, ev, click, moveTo, type, key, shot, close, errors, mouse, listeners };
}
