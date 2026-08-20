import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/tmp/tradecity-nav";
mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 200 },
    deviceScaleFactor: 3,
  });
  const page = await ctx.newPage();

  await page.goto("https://dangotetradecity.trade/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(3500);
  const skip = page.getByRole("button", { name: /skip/i });
  if (await skip.count()) await skip.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(600);

  const dangoteBar = page.locator(".icon-pills-tabs").first();
  await dangoteBar.screenshot({ path: `${OUT}/dangote-pills.png` });

  const ours = await ctx.newPage();
  await ours.goto("http://localhost:3000/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await ours.waitForTimeout(1500);
  const oursBar = ours.locator(".tc-navbar-menus").first();
  if (await oursBar.count()) {
    await oursBar.screenshot({ path: `${OUT}/ours-pills.png` });
  } else {
    await ours.screenshot({ path: `${OUT}/ours-full.png` });
  }

  await browser.close();
  console.log("ok");
})();
