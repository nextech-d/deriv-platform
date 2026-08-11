#!/usr/bin/env node
/**
 * Stop Next.js dev servers for this repo (ports 3000–3010 only).
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function listListeningPids() {
  try {
    const out = execSync("lsof -iTCP:3000-3010 -sTCP:LISTEN -P -n -t", {
      encoding: "utf8",
    });
    return out
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(Number);
  } catch {
    return [];
  }
}

function processCwd(pid) {
  try {
    const out = execSync(`lsof -p ${pid} -a -d cwd -Fn`, { encoding: "utf8" });
    const line = out.split("\n").find((l) => l.startsWith("n"));
    return line ? line.slice(1) : null;
  } catch {
    return null;
  }
}

const pids = listListeningPids();
const killed = [];

for (const pid of pids) {
  const cwd = processCwd(pid);
  if (cwd !== projectRoot) continue;
  try {
    process.kill(pid, "SIGTERM");
    killed.push(pid);
  } catch {
    // already gone
  }
}

if (killed.length === 0) {
  console.log("No deriv-platform dev server found on ports 3000–3010.");
} else {
  console.log(`Stopped dev server(s): ${killed.join(", ")}`);
}
