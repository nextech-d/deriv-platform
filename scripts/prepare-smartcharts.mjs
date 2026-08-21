import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "node_modules/@deriv-com/smartcharts-champion/dist");
const targetDir = join(root, "public/smartcharts");

if (!existsSync(sourceDir)) {
  console.warn("[prepare-smartcharts] package not installed, skipping");
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

for (const name of readdirSync(sourceDir)) {
  const from = join(sourceDir, name);
  if (!statSync(from).isFile()) continue;
  if (
    name.endsWith(".smartcharts.js") ||
    name.endsWith(".smartcharts.js.map") ||
    name.endsWith(".smartcharts.svg") ||
    name === "smartcharts.css" ||
    name === "smartcharts.css.map"
  ) {
    cpSync(from, join(targetDir, name), { force: true });
  }
}

for (const dir of ["chart", "assets"]) {
  const from = join(sourceDir, dir);
  if (existsSync(from)) {
    cpSync(from, join(targetDir, dir), { force: true, recursive: true });
  }
}

console.log("[prepare-smartcharts] copied SmartCharts chunks to public/smartcharts");
