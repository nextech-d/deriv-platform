import { expect, type Page } from "@playwright/test";

/** Main workspace column — avoids sidebar duplicate labels. */
export function workspaceMain(page: Page) {
  return page.locator("main");
}

/** Dashboard shell ready and WS connected (no Offline / Connecting banner). */
export async function waitForLiveConnection(page: Page) {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: "Trade Markets & ticket" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Connecting", { exact: true })).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(page.getByText("Offline", { exact: true })).toHaveCount(0, {
    timeout: 30_000,
  });
}

export async function openSidebarView(page: Page, name: RegExp | string) {
  await page.getByRole("button", { name }).click();
}

export async function openSettings(page: Page) {
  await openSidebarView(page, "Settings Risk & prefs");
}

export async function openCopyView(page: Page) {
  await waitForLiveConnection(page);
  await openSidebarView(page, "Copy Signal providers");
  await expect(workspaceMain(page).getByText("Copy controls")).toBeVisible();
}

export async function openTradeView(page: Page) {
  await waitForLiveConnection(page);
  await openSidebarView(page, "Trade Markets & ticket");
}

export async function openPortfolioView(page: Page) {
  await waitForLiveConnection(page);
  await openSidebarView(page, "Portfolio Open positions");
}

export async function openWalletView(page: Page) {
  await openSidebarView(page, "Wallet Deposit & agents");
}
