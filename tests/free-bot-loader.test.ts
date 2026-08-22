import { describe, expect, it } from "vitest";

// Node doesn't ship DOMParser — test pack parsing via a minimal shim.
function parsePackXml(packXml: string, botId: string): string | null {
  const botMatch = packXml.match(
    new RegExp(`<bot\\s+[^>]*\\bid="${botId}"[^>]*/?>`, "i"),
  );
  if (!botMatch) return null;
  const templateMatch = botMatch[0].match(/template="([^"]+)"/i);
  if (templateMatch?.[1]) return templateMatch[1];
  const defaults = packXml.match(/<defaults\s+template="([^"]+)"/i);
  return defaults?.[1] ?? null;
}

describe("bot pack xml", () => {
  it("resolves per-bot template override", () => {
    const xml = `
      <bot-pack>
        <defaults template="/bots/templates/standard-default.xml" />
        <bot id="martingale-bot" template="/bots/templates/custom.xml" />
      </bot-pack>`;
    expect(parsePackXml(xml, "martingale-bot")).toBe("/bots/templates/custom.xml");
  });

  it("falls back to pack defaults", () => {
    const xml = `
      <bot-pack>
        <defaults template="/bots/templates/premium-default.xml" />
        <bot id="premium-matrix" />
      </bot-pack>`;
    expect(parsePackXml(xml, "premium-matrix")).toBe("/bots/templates/premium-default.xml");
  });
});
