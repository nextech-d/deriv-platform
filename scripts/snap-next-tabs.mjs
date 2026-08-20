import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/tmp/tradecity-compare";
mkdirSync(OUT, { recursive: true });

const DANGOTE_TABS = [
  "Free Bots",
  "D-Trader",
  "Analysis Tool",
  "Signal Center",
];

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto("https://dangotetradecity.trade/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(3500);
  for (let i = 0; i < 3; i++) {
    const skip = page.getByRole("button", { name: /skip/i });
    if (await skip.count()) await skip.first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  for (const tab of DANGOTE_TABS) {
    await page.evaluate((label) => {
      const btn = [...document.querySelectorAll(".icon-pills-tabs__tab")].find((el) =>
        (el.textContent || "").includes(label),
      );
      btn?.click();
    }, tab);
    await page.waitForTimeout(1800);
    const skip = page.getByRole("button", { name: /skip/i });
    if (await skip.count()) await skip.first().click({ timeout: 800 }).catch(() => {});
    await page.waitForTimeout(400);
    const slug = tab.toLowerCase().replace(/\s+/g, "-");
    await page.screenshot({ path: `${OUT}/dangote-${slug}.png` });
    const text = await page.evaluate(() => document.body.innerText.slice(0, 3500));
    writeFileSync(`${OUT}/dangote-${slug}.txt`, text);
    console.log("dangote", tab);
  }

  await page.goto("http://localhost:3000/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(1200);
  for (const tab of DANGOTE_TABS) {
    await page.getByRole("button", { name: tab, exact: true }).first().click();
    await page.waitForTimeout(900);
    const slug = tab.toLowerCase().replace(/\s+/g, "-");
    await page.screenshot({ path: `${OUT}/ours-${slug}.png` });
    console.log("ours", tab);
  }

  await browser.close();
})();
