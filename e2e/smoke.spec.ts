import { expect, test } from "@playwright/test";
import { openSettings, waitForLiveConnection, workspaceMain } from "./helpers";

test.describe("API probes", () => {
  test("health returns ok and version", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const json = (await response.json()) as {
      ok: boolean;
      version: string;
      demoMode: boolean;
    };
    expect(json.ok).toBe(true);
    expect(json.version).toBeTruthy();
    expect(json.demoMode).toBe(true);
  });
});

test.describe("Marketing", () => {
  test("root shows pro landing with aligned nav", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Platform navigation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trade" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Synthetics trading",
    );
  });

  test("nav switches workspace panels independently", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Trade" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Rise/Fall on a resilient market feed",
    );
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "Your desk starts at Home",
    );

    await page.getByRole("button", { name: "Home" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Synthetics trading",
    );
  });
});

test.describe("Dashboard (demo mode)", () => {
  test("terminal opens on home command center", async ({ page }) => {
    await waitForLiveConnection(page);
    await expect(workspaceMain(page).getByText("Home", { exact: true }).first()).toBeVisible();
    await expect(workspaceMain(page).getByRole("heading", { name: /Demo desk|Live desk|Command center/ })).toBeVisible();
    await expect(workspaceMain(page).getByText("Market pulse")).toBeVisible();
  });

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
