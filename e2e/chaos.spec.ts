import { expect, test } from "@playwright/test";
import {
  openHomeView,
  openSettings,
  openTradeView,
  waitForLiveConnection,
  workspaceMain,
} from "./helpers";

test.describe("Chaos / resilience (demo)", () => {
  test("double-click Rise opens a single demo contract", async ({ page }) => {
    await openTradeView(page);
    const rise = workspaceMain(page).getByRole("button", { name: /^Rise$/i });
    await expect(rise).toBeEnabled({ timeout: 30_000 });

    await Promise.all([rise.click(), rise.click()]);

    await expect(workspaceMain(page).getByText(/Demo Rise opened/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(workspaceMain(page).getByText(/Demo Rise opened/i)).toHaveCount(1);
  });

  test("stake cap risk gate blocks oversized buys", async ({ page }) => {
    test.setTimeout(60_000);
    await waitForLiveConnection(page);
    await openSettings(page);

    const tradingGates = workspaceMain(page)
      .locator(".settings-section")
      .filter({ hasText: "Trading gates" });
    const enable = tradingGates.locator(".copy-toggle");
    await expect(enable).toBeVisible();
    if (await enable.getByText("Disabled").count()) {
      await enable.locator('input[type="checkbox"]').check();
    }

    const maxStake = tradingGates
      .locator(".trade-field-group")
      .filter({ hasText: "Max stake (USD)" })
      .locator("input");
    await maxStake.fill("1");

    await openTradeView(page);
    const stakeInput = workspaceMain(page)
      .locator("label.d-trader-field")
      .filter({ hasText: /^Stake/ })
      .locator("input");
    await stakeInput.fill("5");

    const rise = workspaceMain(page).getByRole("button", { name: /^Rise$/i });
    await expect(rise).toBeEnabled({ timeout: 30_000 });
    await rise.click();
    await expect(
      workspaceMain(page).getByText(/Stake exceeds max cap/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("hard refresh keeps terminal home reachable", async ({ page }) => {
    await openHomeView(page);
    await page.reload();
    await waitForLiveConnection(page);
    await expect(
      workspaceMain(page).getByRole("heading", {
        name: /Demo desk|Live desk|Your desk/,
      }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
