// Turns recorded frames into an MP4 at their real timing. Each frame is held until the next one
// arrived, so pauses in the script stay pauses in the video.
// Usage: node tools/encode.mjs <recording-dir> <out.mp4>
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
const [dir = "recording", out = "recording/rules-wrapper.mp4"] = process.argv.slice(2);
const frames = JSON.parse(readFileSync(join(dir, "frames.json"), "utf8"));
let list = "ffconcat version 1.0\n";
frames.forEach((f, i) => {
  const next = frames[i + 1]?.t ?? f.t + 1.2; // hold the last frame a beat
  list += `file '${resolve(f.file)}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}\n`;
});
list += `file '${resolve(frames.at(-1).file)}'\n`;
writeFileSync(join(dir, "frames.ffconcat"), list);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "frames.ffconcat"),
  "-vf", "scale=1920:1080:flags=lanczos,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", "-an", out], { stdio: "inherit" });
console.log("wrote " + out);
