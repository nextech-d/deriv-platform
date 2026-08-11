#!/usr/bin/env node
/**
 * Start dev server, or point to the existing one on :3000.
 */
import { spawn, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function existingDevPid() {
  try {
    const out = execSync("lsof -iTCP:3000 -sTCP:LISTEN -P -n -t", {
      encoding: "utf8",
    });
    const pid = Number(out.trim().split("\n")[0]);
    if (!pid) return null;

    const cwdOut = execSync(`lsof -p ${pid} -a -d cwd -Fn`, { encoding: "utf8" });
    const cwd = cwdOut.split("\n").find((l) => l.startsWith("n"))?.slice(1);
    return cwd === projectRoot ? pid : null;
  } catch {
    return null;
  }
}

const pid = existingDevPid();
if (pid) {
  console.log(`Dev server already running → http://localhost:3000 (PID ${pid})`);
  console.log("Use npm run dev:restart to stop and start fresh.");
  process.exit(0);
}

const child = spawn("npx", ["next", "dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: { ...process.env, BROWSER: "google chrome" },
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
