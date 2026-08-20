import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PaymentAgent, PaymentAgentSource } from "@/lib/payments/config";
import { PAYMENT_AGENTS_FALLBACK } from "@/lib/payments/config";

export interface PartnerAgent extends PaymentAgent {
  active: boolean;
  phone?: string;
}

const DEFAULT_DATA_FILE = path.join(
  process.cwd(),
  "data",
  "payment-agents-partners.json",
);

const SEED_DATA_FILE = path.join(
  process.cwd(),
  "data-seed",
  "payment-agents-partners.json",
);

function resolveDataFilePath(): string {
  const override = process.env.PARTNER_AGENTS_DATA_PATH?.trim();
  return override || DEFAULT_DATA_FILE;
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
    // Seed from bundled default or data-seed (Docker)
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

  await writeFile(target, "[]\n", "utf8");
  return target;
}

export async function loadPartnerAgents(): Promise<PartnerAgent[]> {
  try {
    const file = await ensureDataFile();
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as PartnerAgent[];
  } catch {
    return [];
  }
}

export async function savePartnerAgents(agents: PartnerAgent[]): Promise<void> {
  const file = await ensureDataFile();
  await writeFile(file, `${JSON.stringify(agents, null, 2)}\n`, "utf8");
}

export function tagAgentSource(
  agent: PaymentAgent,
  source: PaymentAgentSource,
): PaymentAgent {
  return { ...agent, source };
}

export function mergeAgents(
  derivAgents: PaymentAgent[],
  partners: PartnerAgent[],
  country: string,
  baseSource: PaymentAgentSource = "deriv",
): PaymentAgent[] {
  const taggedBase = derivAgents.map((agent) =>
    tagAgentSource(agent, agent.source ?? baseSource),
  );

  const activePartners = partners
    .filter((p) => p.active && p.country === country)
    .map(({ active, ...rest }) => {
      void active;
      return tagAgentSource(rest, "partner");
    });

  return [...taggedBase, ...activePartners];
}

/** Tag fallback directory entries when Deriv API is unavailable. */
export function fallbackAgentsForCountry(country: string): PaymentAgent[] {
  return PAYMENT_AGENTS_FALLBACK.filter((a) => a.country === country).map(
    (agent) => tagAgentSource(agent, "fallback"),
  );
}

export { isAuthorized } from "@/lib/admin/auth";
export { resolveDataFilePath };
