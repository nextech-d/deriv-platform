import { chromium } from "@playwright/test";

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 1200 } })).newPage();
  await page.goto("https://dangotetradecity.trade/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);
  const skip = page.getByRole("button", { name: /^skip$/i });
  if (await skip.count()) await skip.click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Bulk Trader" }).click({ force: true, timeout: 8000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/tradecity-compare/d-bulk-layout.png", fullPage: false });
  const text = await page.locator("body").innerText();
  console.log(text.split("\n").filter(Boolean).slice(18, 50).join(" || "));
  await browser.close();
})();
