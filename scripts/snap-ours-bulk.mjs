import { chromium } from "@playwright/test";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Bulk Trader" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/tradecity-compare/ours-bulk-layout.png", fullPage: false });
  await browser.close();
  console.log("ours ok");
})();
