import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/tmp/tradecity-compare";
mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();
  await page.goto("https://dangotetradecity.trade/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);

  const skip = page.getByRole("button", { name: /skip/i });
  if (await skip.count()) await skip.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/dangote-dashboard.png` });

  const dump = await page.evaluate(() => {
    const root = document.querySelector("main") || document.body;
    return {
      html: (root.innerHTML || "").slice(0, 20000),
      text: document.body.innerText.slice(0, 4000),
      cssVars: getComputedStyle(document.documentElement).cssText.slice(0, 2000),
      headerBg: getComputedStyle(document.querySelector("header") || document.body).backgroundColor,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      tabActive: (() => {
        const t = document.querySelector(".icon-pills-tabs__tab--active");
        if (!t) return null;
        const s = getComputedStyle(t);
        return { bg: s.backgroundColor, color: s.color, border: s.border, radius: s.borderRadius };
      })(),
      tabBar: (() => {
        const t = document.querySelector(".icon-pills-tabs");
        if (!t) return null;
        const s = getComputedStyle(t);
        return { bg: s.backgroundColor, color: s.color };
      })(),
    };
  });
  writeFileSync(`${OUT}/dangote-dashboard.json`, JSON.stringify(dump, null, 2));

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".icon-pills-tabs__tab")].find((el) =>
      (el.textContent || "").includes("Bot Builder"),
    );
    btn?.click();
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/dangote-bot-builder.png` });

  await browser.close();
  console.log("ok");
})();
