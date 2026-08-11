import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

/** Seed isolated JSON registries before Playwright starts the dev server. */
export default async function globalSetup() {
  const root = process.cwd();
  const dataDir = path.join(root, "e2e/.data");
  await mkdir(dataDir, { recursive: true });

  await copyFile(
    path.join(root, "e2e/fixtures/copy-providers.json"),
    path.join(dataDir, "copy-providers.json"),
  );
  await copyFile(
    path.join(root, "e2e/fixtures/partners.json"),
    path.join(dataDir, "partners.json"),
  );
}
