import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const OUT = "/tmp/tradecity-compare";
mkdirSync(OUT, { recursive: true });

function box(el) {
  if (!el) return null;
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName,
    class: el.className?.toString?.().slice(0, 180),
    w: Math.round(r.width),
    h: Math.round(r.height),
    bg: s.background,
    bgc: s.backgroundColor,
    color: s.color,
    border: s.border,
    radius: s.borderRadius,
    pad: s.padding,
    gap: s.gap,
    font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight} ${s.fontFamily.split(",")[0]}`,
    shadow: s.boxShadow,
    display: s.display,
    align: s.alignItems,
    justify: s.justifyContent,
  };
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
  const page = await ctx.newPage();
  await page.goto("https://dangotetradecity.trade/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  const skip = page.getByRole("button", { name: /skip/i });
  if (await skip.count()) await skip.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const dump = await page.evaluate(() => {
    const pick = (sel) => document.querySelector(sel);
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const box = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        class: el.className?.toString?.().slice(0, 220),
        w: Math.round(r.width),
        h: Math.round(r.height),
        bg: s.backgroundImage !== "none" ? s.backgroundImage.slice(0, 240) : s.backgroundColor,
        bgc: s.backgroundColor,
        color: s.color,
        border: `${s.borderWidth} ${s.borderStyle} ${s.borderColor}`,
        radius: s.borderRadius,
        pad: s.padding,
        gap: s.gap,
        font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight} ${s.fontFamily.split(",")[0]}`,
        shadow: s.boxShadow,
        display: s.display,
        align: s.alignItems,
        justify: s.justifyContent,
        minH: s.minHeight,
      };
    };

    const header = pick("header");
    const tabs = pick(".icon-pills-tabs");
    const list = pick(".icon-pills-tabs__list");
    const tab = pick(".icon-pills-tabs__tab");
    const active = pick(".icon-pills-tabs__tab--active");
    const label = pick(".icon-pills-tabs__label");
    const logo = pick(".d-apollo-logo__image, .logo-holder img, header img");

    const pills = [...document.querySelectorAll(".icon-pills-tabs__tab")].map((el) => {
      const svg = el.querySelector("svg");
      return {
        label: (el.textContent || "").replace(/\s+/g, " ").trim(),
        html: el.innerHTML,
        svg: svg
          ? {
              viewBox: svg.getAttribute("viewBox"),
              width: svg.getAttribute("width"),
              height: svg.getAttribute("height"),
              fill: svg.getAttribute("fill"),
              inner: svg.innerHTML,
            }
          : null,
        style: box(el),
      };
    });

    const cssVars = tabs
      ? [
          "--container-bg",
          "--container-border",
          "--pill-border",
          "--pill-hover-bg",
          "--pill-active-border",
          "--pill-text",
          "--pill-active-text",
          "--tab-icon-color",
        ].reduce((acc, k) => {
          acc[k] = getComputedStyle(tabs).getPropertyValue(k);
          return acc;
        }, {})
      : {};

    return {
      header: box(header),
      headerHtml: header?.innerHTML?.slice(0, 8000),
      tabs: box(tabs),
      list: box(list),
      tab: box(tab),
      active: box(active),
      label: box(label),
      logo: logo
        ? { src: logo.getAttribute("src"), w: logo.getBoundingClientRect().width, h: logo.getBoundingClientRect().height }
        : null,
      cssVars,
      pills: pills.map((p) => ({
        label: p.label,
        svg: p.svg,
        style: p.style,
      })),
      pillCount: pills.length,
    };
  });

  writeFileSync(`${OUT}/d-nav.json`, JSON.stringify(dump, null, 2));
  await page.screenshot({ path: `${OUT}/d-nav.png`, fullPage: false });
  await browser.close();
  console.log("pills", dump.pillCount, "header h", dump.header?.h, "tabs h", dump.tabs?.h);
})();
