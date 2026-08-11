import { expect, test } from "@playwright/test";
import { openSettings, waitForLiveConnection } from "./helpers";

test.describe("Marketing", () => {
  test("root redirects to dashboard in demo mode", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Dashboard (demo mode)", () => {
  test("terminal loads with live connection", async ({ page }) => {
    await waitForLiveConnection(page);
    await expect(
      page.getByRole("button", { name: "Copy Signal providers" }),
    ).toBeVisible();
  });

  test("theme switch updates document theme", async ({ page }) => {
    await waitForLiveConnection(page);
    await openSettings(page);

    await page.locator(".prefs-theme-option", { hasText: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.locator(".prefs-theme-option", { hasText: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("header theme toggle cycles preference", async ({ page }) => {
    await waitForLiveConnection(page);
    const toggle = page.getByRole("button", { name: /Theme:/i });
    await expect(toggle).toBeVisible();

    const before = await toggle.getAttribute("aria-label");
    await toggle.click();
    const after = await toggle.getAttribute("aria-label");
    expect(before).not.toBe(after);
  });
});
