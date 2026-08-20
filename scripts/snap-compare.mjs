import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

const OUT = "/tmp/tradecity-compare";
mkdirSync(OUT, { recursive: true });

async function dump(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  const info = await page.evaluate(() => {
    const pills = [...document.querySelectorAll(".icon-pills-tabs__tab, [class*='pill'], nav button, header a")]
      .slice(0, 40)
      .map((el) => ({
        tag: el.tagName,
        className: String(el.className).slice(0, 80),
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
      }));
    return {
      title: document.title,
      url: location.href,
      bg: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
      headerHtml: document.querySelector("header")?.innerHTML?.slice(0, 1500) ?? null,
      navText: (document.querySelector("nav")?.innerText || "").slice(0, 800),
      bodyText: document.body.innerText.slice(0, 2500),
      pills,
    };
  });
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(info, null, 2));
}

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
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  const page = await ctx.newPage();

  await page.goto("https://dangotetradecity.trade/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    document.querySelectorAll(".modal, [class*='modal'], [class*='overlay']").forEach((el) => {
      if (el instanceof HTMLElement && el.innerText.toLowerCase().includes("welcome")) {
        el.style.display = "none";
      }
    });
  });
  await dump(page, "dangote-home");

  await page.goto("http://localhost:3000/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  await dump(page, "ours-dashboard");

  await browser.close();
  console.log("Wrote", OUT);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
