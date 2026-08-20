import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const res = await page.goto("http://localhost:3000/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  console.log("status", res?.status(), "url", page.url());
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/tradecity-compare/ours-dashboard-now.png" });
  const tabs = await page.locator("nav button").allTextContents();
  console.log("tabs", tabs.slice(0, 20));
  const h1 = await page.locator("h1").first().textContent().catch(() => null);
  console.log("h1", h1);
  await browser.close();
})();
