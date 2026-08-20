import { expect, test } from "@playwright/test";
import {
  openCopyView,
  openPortfolioView,
  openSettings,
  openTradeView,
  waitForLiveConnection,
  workspaceMain,
} from "./helpers";

async function followFirstProvider(page: import("@playwright/test").Page) {
  const followButtons = workspaceMain(page).getByRole("button", { name: /^Follow$/i });
  await expect(followButtons.first()).toBeVisible();
  await followButtons.first().click();
  await expect(
    workspaceMain(page).locator(".copy-trader-chip").filter({ hasText: /\d+ following/ }),
  ).toBeVisible();
}

async function waitForCopySignal(page: import("@playwright/test").Page) {
  await expect(
    workspaceMain(page).locator(".copy-signal-card").first(),
  ).toBeVisible({ timeout: 90_000 });
}

async function openTradeAndBuyRise(page: import("@playwright/test").Page) {
  await openTradeView(page);
  const rise = workspaceMain(page).getByRole("button", { name: /^Rise$/i });
  await expect(rise).toBeEnabled({ timeout: 30_000 });
  await rise.click();
  await expect(workspaceMain(page).getByText(/Demo Rise opened/i)).toBeVisible({
    timeout: 20_000,
  });
}

async function waitForOpenPositionCount(page: import("@playwright/test").Page, count: string) {
  await openPortfolioView(page);
  await expect(
    workspaceMain(page).locator(".portfolio-count-chip").filter({ hasText: `${count} open` }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("Copy trading (demo)", () => {
  test("copy desk loads provider list and controls", async ({ page }) => {
    await openCopyView(page);
    await expect(
      workspaceMain(page).locator(".desk-head-title", { hasText: "Providers" }),
    ).toBeVisible();
    await expect(workspaceMain(page).getByText("Auto-copy new signals")).toBeVisible();
    await expect(
      workspaceMain(page).locator(".desk-head-title", { hasText: "Feed" }),
    ).toBeVisible();
  });

  test("follow provider updates following count", async ({ page }) => {
    await openCopyView(page);
    await followFirstProvider(page);
    await expect(
      workspaceMain(page).getByRole("button", { name: /^Unfollow$/i }).first(),
    ).toBeVisible();
  });

  test("followed desk shows watching symbols", async ({ page }) => {
    await openCopyView(page);
    await followFirstProvider(page);
    await expect(
      workspaceMain(page).locator(".copy-watch-rail .session-metric-label").filter({
        hasText: "Watching",
      }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("manual copy trade when signal appears", async ({ page }) => {
    test.setTimeout(120_000);
    await openCopyView(page);
    await followFirstProvider(page);

    await waitForCopySignal(page);
    const copyBtn = workspaceMain(page).getByRole("button", { name: /^Copy trade$/i }).first();
    await copyBtn.click();

    await expect(workspaceMain(page).getByText(/Copy sent|Auto-copied/i)).toBeVisible({
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
    test.setTimeout(90_000);
    await openTradeAndBuyRise(page);
    await waitForOpenPositionCount(page, "1");
    await expect(
      workspaceMain(page).locator(".portfolio-source-badge", { hasText: "Manual" }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(workspaceMain(page).locator(".portfolio-row").first()).toBeVisible();
  });

  test("copy position shows copy badge after signal copy", async ({ page }) => {
    test.setTimeout(120_000);
    await openCopyView(page);
    await followFirstProvider(page);
    await waitForCopySignal(page);

    const copyBtn = workspaceMain(page).getByRole("button", { name: /^Copy trade$/i }).first();
    await copyBtn.click();
    await expect(workspaceMain(page).getByText(/Copy sent|Auto-copied/i)).toBeVisible({
      timeout: 10_000,
    });

    await openPortfolioView(page);
    await expect(
      workspaceMain(page).locator(".portfolio-source-badge", { hasText: "Copy" }).first(),
    ).toBeVisible({ timeout: 15_000 });
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
