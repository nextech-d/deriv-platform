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
    const nav = page.getByRole("navigation", { name: "Platform navigation" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("button", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Trade" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Synthetics trading",
    );
  });

  test("nav switches workspace panels independently", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Platform navigation" });
    await nav.getByRole("button", { name: "Trade" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Rise/Fall tickets on the synthetic rail",
    );
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "Synthetics trading",
    );

    await nav.getByRole("button", { name: "Home" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Synthetics trading",
    );
  });
});

test.describe("Dashboard (demo mode)", () => {
  test("terminal opens on home command center", async ({ page }) => {
    await waitForLiveConnection(page);
    await expect(
      workspaceMain(page).getByRole("heading", {
        name: /Demo desk|Live desk|Your desk/,
      }),
    ).toBeVisible();
    await expect(workspaceMain(page).getByText("Market pulse")).toBeVisible();
  });

  test("terminal loads with live connection", async ({ page }) => {
    await waitForLiveConnection(page);
    await expect(
      page.getByRole("complementary", { name: "Terminal navigation" }).getByRole(
        "button",
        { name: "Copy Follow providers" },
      ),
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
