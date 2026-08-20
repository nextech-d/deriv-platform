import { expect, type Page } from "@playwright/test";

/** Main workspace column — avoids navbar duplicate labels. */
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
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await skip.waitFor({
        state: "visible",
        timeout: attempt === 0 ? 1_500 : 800,
      });
      await skip.click();
    } catch {
      return;
    }
  }
}

/** Chrome-only views (Settings / Wallet / Portfolio) live on the dashboard hash. */
export async function openHashView(
  page: Page,
  hash: "settings" | "wallet" | "portfolio",
) {
  if (!page.url().includes("/dashboard")) {
    await page.goto(`/dashboard#${hash}`);
  } else {
    await page.evaluate((next) => {
      window.location.hash = next;
    }, hash);
  }
  await page.waitForURL(new RegExp(`#${hash}`));
  await dismissTour(page);
}

export async function clickDashboardWindow(page: Page, title: string) {
  await workspaceMain(page)
    .locator(".terminal-home-window")
    .filter({ hasText: title })
    .click();
  await dismissTour(page);
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
  await platformNav(page).getByRole("button", {
    name: label,
    exact: typeof label === "string",
  }).click();
  await dismissTour(page);
}

export async function openSettings(page: Page) {
  await waitForLiveConnection(page);
  await openHashView(page, "settings");
  await expect(workspaceMain(page).getByText("Trading gates")).toBeVisible({
    timeout: 15_000,
  });
}

export async function openCopyView(page: Page) {
  await waitForLiveConnection(page);
  await openSidebarView(page, "Copy Trader");
  await expect(workspaceMain(page).getByText("Copy controls")).toBeVisible();
}

/** At least one live tick received on D-Trader (chart quote, not the old 4-dp ticker). */
export async function waitForMarketTicks(page: Page) {
  await expect(page.getByTestId("d-trader-desk")).toBeVisible({ timeout: 20_000 });
  await expect(workspaceMain(page).locator(".chart-desk-quote strong")).toHaveText(
    /\d+\.\d+/,
    { timeout: 30_000 },
  );
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
  await openHashView(page, "portfolio");
  await expect(workspaceMain(page).getByText("Open book")).toBeVisible({
    timeout: 15_000,
  });
}

export async function openWalletView(page: Page) {
  await openHomeView(page);
  await openHashView(page, "wallet");
}
