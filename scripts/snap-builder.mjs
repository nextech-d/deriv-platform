import { chromium } from "playwright";
import { writeFileSync } from "fs";

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
  await page.waitForTimeout(4000);
  for (const name of ["Skip", "Skip"]) {
    const btn = page.getByRole("button", { name });
    if (await btn.count()) await btn.first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".icon-pills-tabs__tab")].find((el) =>
      (el.textContent || "").includes("Bot Builder"),
    );
    btn?.click();
  });
  await page.waitForTimeout(2500);
  for (const name of ["Skip"]) {
    const btn = page.getByRole("button", { name });
    if (await btn.count()) await btn.first().click({ timeout: 2000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/tradecity-compare/dangote-builder.png" });

  const menu = await page.evaluate(() => {
    const sidebar =
      document.querySelector(".blocklyToolboxDiv") ||
      document.querySelector("[class*='toolbox']") ||
      document.querySelector("[class*='blocks-menu']") ||
      document.querySelector("aside");
    return {
      text: (sidebar?.innerText || document.body.innerText).slice(0, 4000),
      html: (sidebar?.innerHTML || "").slice(0, 8000),
    };
  });
  writeFileSync("/tmp/tradecity-compare/dangote-builder-menu.json", JSON.stringify(menu, null, 2));

  await page.evaluate(() => {
    const el = [...document.querySelectorAll("div,button,span")].find(
      (n) => n.childNodes.length && n.textContent?.trim() === "Analysis",
    );
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/tradecity-compare/dangote-builder-analysis.png" });

  const after = await page.evaluate(() => document.body.innerText.slice(0, 5000));
  writeFileSync("/tmp/tradecity-compare/dangote-builder-analysis.txt", after);

  await browser.close();
  console.log("done");
})();
