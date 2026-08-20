import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Bot Builder", exact: true }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/tradecity-compare/ours-builder.png" });
  await page.getByRole("button", { name: "Analysis", exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/tradecity-compare/ours-builder-analysis.png" });
  const menu = await page.locator("[data-testid=bot-builder-desk] aside").first().innerText();
  console.log(menu.slice(0, 800));
  await page.getByRole("button", { name: "Indicators" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/tradecity-compare/ours-builder-indicators.png" });
  await browser.close();
})();
