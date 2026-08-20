import { expect, type Page } from "@playwright/test";

/** Main workspace column — avoids sidebar duplicate labels. */
export function workspaceMain(page: Page) {
  return page.locator("main");
}

/** Product menu strip. */
export function platformNav(page: Page) {
  return page.getByRole("navigation", { name: "Platform navigation" });
}

/** @deprecated Use platformNav — the old rail is no longer in the shell. */
export function workspaceSidebar(page: Page) {
  return platformNav(page);
}

async function dismissTour(page: Page) {
  const skip = page.getByRole("button", { name: "Skip" });
  try {
    await skip.waitFor({ state: "visible", timeout: 1500 });
    await skip.click();
  } catch {
    // Tour already dismissed or not shown.
  }
}

/** Dashboard shell ready (nav + desk). Connection may still be connecting. */
export async function waitForLiveConnection(page: Page) {
  if (!page.url().includes("/dashboard")) {
    await page.goto("/dashboard");
  }
  await expect(platformNav(page).getByRole("button", { name: "Dashboard" })).toBeVisible({
    timeout: 20_000,
  });
  await dismissTour(page);
  await platformNav(page).getByRole("button", { name: "Dashboard" }).click();
  await dismissTour(page);
  await expect(
    workspaceMain(page).getByRole("heading", {
      name: /Demo desk|Live desk|Your desk/,
    }),
  ).toBeVisible({ timeout: 20_000 });
}

export async function openSidebarView(page: Page, name: RegExp | string) {
  const label =
    typeof name === "string"
      ? name
          .replace("Copy trading Follow providers", "Copy Trader")
          .replace("Dashboard Balance & pulse", "Dashboard")
          .replace("Manual trading Rise/Fall ticket", "D-Trader")
      : name;
  await platformNav(page).getByRole("button", { name: label }).click();
  await dismissTour(page);
}

export async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click();
}

export async function openCopyView(page: Page) {
  await waitForLiveConnection(page);
  await openSidebarView(page, "Copy Trader");
  await expect(workspaceMain(page).getByText("Copy controls")).toBeVisible();
}

/** At least one live tick received (quote numeric, not placeholder). */
export async function waitForMarketTicks(page: Page) {
  await expect(
    workspaceMain(page).locator(".market-quote-value").filter({
      hasText: /^\d+\.\d{4}$/,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function openHomeView(page: Page) {
  await waitForLiveConnection(page);
  await openSidebarView(page, "Dashboard");
  await expect(
    workspaceMain(page).getByRole("heading", {
      name: /Demo desk|Live desk|Your desk/,
    }),
  ).toBeVisible();
}

export async function openTradeView(page: Page) {
  await waitForLiveConnection(page);
  await openSidebarView(page, "D-Trader");
  await waitForMarketTicks(page);
}

export async function openPortfolioView(page: Page) {
  await waitForLiveConnection(page);
  await openHomeView(page);
  await workspaceMain(page)
    .getByRole("button", { name: /Portfolio Review the open book/i })
    .click();
}

export async function openWalletView(page: Page) {
  await openHomeView(page);
  await workspaceMain(page)
    .getByRole("button", { name: /Wallet Cashier and agents/i })
    .click();
}
