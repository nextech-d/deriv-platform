import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CURATED_PROVIDERS } from "@/lib/copy/providers";
import type { SignalProvider } from "@/lib/copy/types";

export interface CopyProviderRecord extends SignalProvider {
  active: boolean;
}

const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "copy-providers.json");

const SEED_DATA_FILE = path.join(process.cwd(), "data-seed", "copy-providers.json");

function resolveDataFilePath(): string {
  const override = process.env.COPY_PROVIDERS_DATA_PATH?.trim();
  return override || DEFAULT_DATA_FILE;
}

function stripActive(record: CopyProviderRecord): SignalProvider {
  const { active, ...provider } = record;
  void active;
  return provider;
}

export function curatedAsRecords(): CopyProviderRecord[] {
  return CURATED_PROVIDERS.map((provider) => ({ ...provider, active: true }));
}

async function ensureDataFile(): Promise<string> {
  const target = resolveDataFilePath();
  if (target === DEFAULT_DATA_FILE) {
    return target;
  }

  try {
    await readFile(target, "utf8");
    return target;
  } catch {
    // seed from bundled default or data-seed (Docker)
  }

  await mkdir(path.dirname(target), { recursive: true });

  for (const seedPath of [SEED_DATA_FILE, DEFAULT_DATA_FILE]) {
    try {
      await copyFile(seedPath, target);
      return target;
    } catch {
      // try next seed source
    }
  }

  await writeFile(
    target,
    `${JSON.stringify(curatedAsRecords(), null, 2)}\n`,
    "utf8",
  );
  return target;
}

export async function loadCopyProviderRecords(): Promise<CopyProviderRecord[]> {
  try {
    const file = await ensureDataFile();
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as CopyProviderRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return curatedAsRecords();
    }
    return parsed;
  } catch {
    return curatedAsRecords();
  }
}

export async function loadActiveCopyProviders(): Promise<SignalProvider[]> {
  const records = await loadCopyProviderRecords();
  return records.filter((row) => row.active).map(stripActive);
}

export async function saveCopyProviderRecords(
  providers: CopyProviderRecord[],
): Promise<void> {
  const file = await ensureDataFile();
  await writeFile(file, `${JSON.stringify(providers, null, 2)}\n`, "utf8");
}

export { resolveDataFilePath as resolveCopyProvidersDataFilePath };
