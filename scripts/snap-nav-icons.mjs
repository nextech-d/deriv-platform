import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/tmp/tradecity-nav";
mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 220 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  const page = await ctx.newPage();
  await page.goto("https://dangotetradecity.trade/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);

  const skip = page.getByRole("button", { name: /skip/i });
  if (await skip.count()) await skip.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);

  const dump = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll(".icon-pills-tabs__tab, [class*='icon-pills'] button, nav button")];
    const unique = [];
    const seen = new Set();
    for (const el of tabs) {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      const svg = el.querySelector("svg, img, i, [class*='icon']");
      const computed = svg ? getComputedStyle(svg) : null;
      unique.push({
        text,
        className: String(el.className).slice(0, 160),
        html: el.innerHTML.slice(0, 2500),
        color: computed?.color,
        fill: computed?.fill,
        width: computed?.width,
        height: computed?.height,
      });
    }
    const bar =
      document.querySelector(".icon-pills-tabs") ||
      document.querySelector("[class*='icon-pills']") ||
      document.querySelector("header");
    return {
      barClass: bar ? String(bar.className) : null,
      barHtml: bar ? bar.outerHTML.slice(0, 8000) : null,
      tabs: unique,
    };
  });

  writeFileSync(`${OUT}/dangote-nav.json`, JSON.stringify(dump, null, 2));

  const bar = page.locator(".icon-pills-tabs, [class*='icon-pills'], header").first();
  if (await bar.count()) {
    await bar.screenshot({ path: `${OUT}/dangote-nav.png` });
  } else {
    await page.screenshot({ path: `${OUT}/dangote-nav.png` });
  }

  await browser.close();
  console.log("wrote", OUT, "tabs", dump.tabs.length);
})();
