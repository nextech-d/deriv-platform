import type { FreeBotCategory, FreeBotStrategy } from "@/lib/terminal/free-bots";
import {
  freeBotToSnapshot,
  snapshotFromXml,
  type BotBuilderSnapshot,
} from "@/lib/terminal/strategy-seed";

const PACK_PATH: Record<FreeBotCategory, string> = {
  free: "/bots/standard-bots.xml",
  premium: "/bots/premium-bots.xml",
};

const DEFAULT_TEMPLATE: Record<FreeBotCategory, string> = {
  free: "/bots/templates/standard-default.xml",
  premium: "/bots/templates/premium-default.xml",
};

const xmlCache = new Map<string, Promise<string>>();

function fetchText(path: string): Promise<string> {
  const cached = xmlCache.get(path);
  if (cached) return cached;
  const promise = fetch(path, { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Missing bot XML at ${path}`);
    }
    return response.text();
  });
  xmlCache.set(path, promise);
  return promise;
}

function parsePackXml(packXml: string, botId: string): string | null {
  if (typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(packXml, "application/xml");
  if (doc.querySelector("parsererror")) return null;

  const botNode =
    doc.querySelector(`bot[id="${botId}"]`) ??
    doc.querySelector(`strategy[id="${botId}"]`) ??
    doc.querySelector(`bot[id='${botId}']`);

  if (!botNode) return null;

  const template = botNode.getAttribute("template") ?? botNode.getAttribute("href");
  if (template) return template.startsWith("/") ? template : `/bots/templates/${template}`;

  const inline =
    botNode.querySelector("strategy")?.textContent?.trim() ??
    botNode.querySelector("xml")?.textContent?.trim() ??
    (botNode.textContent?.includes("<block") ? botNode.textContent.trim() : null);

  return inline || null;
}

function defaultTemplateFromPack(packXml: string): string | null {
  if (typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(packXml, "application/xml");
  const defaults = doc.querySelector("defaults");
  const template = defaults?.getAttribute("template");
  if (!template) return null;
  return template.startsWith("/") ? template : `/bots/templates/${template}`;
}

async function loadStrategyXml(strategy: FreeBotStrategy): Promise<string> {
  const perBotPath = `/bots/${strategy.category}/${strategy.id}.xml`;

  try {
    return await fetchText(perBotPath);
  } catch {
    // fall through
  }

  try {
    const packXml = await fetchText(PACK_PATH[strategy.category]);
    const resolved = parsePackXml(packXml, strategy.id);
    if (resolved) {
      if (resolved.includes("<block") || resolved.startsWith("<?xml")) {
        return resolved;
      }
      return fetchText(resolved);
    }
    const packDefault = defaultTemplateFromPack(packXml);
    if (packDefault) return fetchText(packDefault);
  } catch {
    // fall through
  }

  return fetchText(DEFAULT_TEMPLATE[strategy.category]);
}

/** Load a trading-bot catalog entry into a builder snapshot (XML-first, heuristic fallback). */
export async function loadFreeBotSnapshot(
  strategy: FreeBotStrategy,
): Promise<BotBuilderSnapshot> {
  try {
    const xml = await loadStrategyXml(strategy);
    const snapshot = snapshotFromXml(xml);
    if (snapshot) {
      return {
        ...snapshot,
        sourceLabel: `${strategy.category === "premium" ? "Premium" : "Standard"} · ${strategy.name}`,
      };
    }
  } catch {
    // use heuristic seed
  }

  return freeBotToSnapshot(strategy);
}
