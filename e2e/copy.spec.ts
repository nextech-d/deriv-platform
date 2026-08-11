import { expect, test } from "@playwright/test";
import { openCopyView, openPortfolioView, openSettings, openTradeView, waitForLiveConnection } from "./helpers";

async function followFirstProvider(page: import("@playwright/test").Page) {
  const followButtons = page.getByRole("button", { name: /^Follow$/i });
  await expect(followButtons.first()).toBeVisible();
  await followButtons.first().click();
  await expect(page.getByText(/\d+ following/)).toBeVisible();
}

async function openTradeAndBuyRise(page: import("@playwright/test").Page) {
  await openTradeView(page);
  await expect(page.getByRole("button", { name: /^Rise$/i })).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: /^Rise$/i }).click();
  await expect(page.getByText(/Demo Rise opened|opened/i)).toBeVisible({
    timeout: 15_000,
  });
}

test.describe("Copy trading (demo)", () => {
  test("copy desk loads provider list and controls", async ({ page }) => {
    await openCopyView(page);
    await expect(page.getByText("Signal providers")).toBeVisible();
    await expect(page.getByText("Auto-copy new signals")).toBeVisible();
    await expect(page.getByText("Live feed")).toBeVisible();
  });

  test("follow provider updates following count", async ({ page }) => {
    await openCopyView(page);
    await followFirstProvider(page);
    await expect(page.getByRole("button", { name: /^Unfollow$/i }).first()).toBeVisible();
  });

  test("followed desk shows watching symbols", async ({ page }) => {
    await openCopyView(page);
    await followFirstProvider(page);
    await expect(page.getByText("Watching")).toBeVisible({ timeout: 10_000 });
  });

  test("manual copy trade when signal appears", async ({ page }) => {
    test.setTimeout(90_000);
    await openCopyView(page);
    await followFirstProvider(page);

    const copyBtn = page.getByRole("button", { name: /^Copy trade$/i }).first();
    await expect(copyBtn).toBeVisible({ timeout: 60_000 });
    await copyBtn.click();

    await expect(page.getByText(/Copy sent|Auto-copied/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("copy settings link opens studios section", async ({ page }) => {
    await waitForLiveConnection(page);
    await openSettings(page);
    await expect(page.getByRole("link", { name: /Copy provider studio/i })).toHaveAttribute(
      "href",
      "/admin/copy",
    );
  });
});

test.describe("Portfolio source filters", () => {
  test("filters manual positions after demo trade", async ({ page }) => {
    await openTradeAndBuyRise(page);

    await openPortfolioView(page);
    await expect(page.getByText(/\d+ open/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Manual/i }).click();
    await expect(page.locator(".portfolio-list .portfolio-row").first()).toBeVisible();

    await page.getByRole("button", { name: /All/i }).click();
    await expect(page.locator(".portfolio-list .portfolio-row").first()).toBeVisible();
  });

  test("copy position shows copy badge after signal copy", async ({ page }) => {
    test.setTimeout(120_000);
    await openCopyView(page);
    await followFirstProvider(page);

    const copyBtn = page.getByRole("button", { name: /^Copy trade$/i }).first();
    await expect(copyBtn).toBeVisible({ timeout: 60_000 });
    await copyBtn.click();
    await expect(page.getByText(/Copy sent|Auto-copied/i)).toBeVisible({
      timeout: 10_000,
    });

    await openPortfolioView(page);
    await page.getByRole("button", { name: /\d+ Copy/ }).click();
    await expect(
      page.locator(".portfolio-source-badge", { hasText: "Copy" }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Copy providers API", () => {
  test("public catalog returns providers", async ({ request }) => {
    const response = await request.get("/api/copy/providers");
    expect(response.ok()).toBeTruthy();
    const json = (await response.json()) as {
      providers: Array<{ id: string; name: string }>;
    };
    expect(json.providers.length).toBeGreaterThan(0);
    expect(json.providers[0]?.id).toBeTruthy();
  });
});
