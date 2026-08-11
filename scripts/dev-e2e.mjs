#!/usr/bin/env node
/**
 * Dev server for Playwright — forces demo mode over .env.local overrides.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const child = spawn("npx", ["next", "dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_DEMO_MODE: "true",
    SESSION_SECRET: "e2e-test-session-secret-min-32-chars!!",
    ADMIN_SECRET: "e2e-test-admin-secret-min-32-chars!!",
    BROWSER: "google chrome",
  },
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
