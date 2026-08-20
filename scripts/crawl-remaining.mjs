import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/tmp/tradecity-compare";
mkdirSync(OUT, { recursive: true });

const TABS = [
  "Dashboard",
  "Money Management",
  "Copy Trader",
  "Edging",
  "Edging 2",
  "Fast Trader",
  "Charts",
  "Ultimate Bot",
  "Bulk Trader",
];

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await page.goto("https://dangotetradecity.trade/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  for (let i = 0; i < 4; i++) {
    const skip = page.getByRole("button", { name: /skip/i });
    if (await skip.count()) await skip.first().click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(300);
  }

  for (const tab of TABS) {
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
    await page.screenshot({ path: `${OUT}/d-${slug}.png`, fullPage: false });
    const dump = await page.evaluate(() => {
      const main =
        document.querySelector(".main__container") ||
        document.querySelector("[data-testid]") ||
        document.body;
      return {
        title: document.title,
        text: document.body.innerText.slice(0, 6000),
        inputs: [...document.querySelectorAll("input,select,button,h1,h2,h3,label")]
          .slice(0, 80)
          .map((el) => ({
            tag: el.tagName,
            type: el.getAttribute("type"),
            text: (el.textContent || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 80),
          })),
      };
    });
    writeFileSync(`${OUT}/d-${slug}.json`, JSON.stringify(dump, null, 2));
    console.log(tab, dump.text.split("\n").filter(Boolean).slice(20, 45).join(" | "));
  }
  await browser.close();
})();
