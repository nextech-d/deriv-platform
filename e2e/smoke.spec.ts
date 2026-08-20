import { expect, test } from "@playwright/test";
import {
  clickDashboardWindow,
  platformNav,
  waitForLiveConnection,
  workspaceMain,
} from "./helpers";

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
    await expect(nav.getByRole("button", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Bot Builder" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Free Bots" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Analysis Tool" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Bulk Trader" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your bot desk",
    );
    await expect(page.getByRole("button", { name: /Load Bot/i })).toBeVisible();
    await page.getByRole("button", { name: /Load Bot/i }).click();
    const marketingLoad = page.getByRole("dialog", { name: "Load Bot" });
    await expect(marketingLoad).toBeVisible();
    await expect(marketingLoad.getByText("My computer", { exact: true })).toBeVisible();
    await expect(marketingLoad.getByText("Google Drive", { exact: true })).toBeVisible();
    await expect(marketingLoad.getByText("Bot builder", { exact: true })).toBeVisible();
    await expect(marketingLoad.getByText("Quick strategy", { exact: true })).toBeVisible();
    await marketingLoad.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: /Switch to (dark|light) theme/i })).toBeVisible();
  });

  test("nav switches workspace panels independently", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Platform navigation" });
    await nav.getByRole("button", { name: "Analysis Tool" }).click();
    await expect(page.getByText("DCIRCLE")).toBeVisible();

    await nav.getByRole("button", { name: "Signal Center" }).click();
    await expect(page.getByTestId("signal-center-desk")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Signal Hack" })).toBeVisible();

    await nav.getByRole("button", { name: "Money Management" }).click();
    await expect(page.getByTestId("money-mgmt-desk")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Money Management" })).toBeVisible();

    await nav.getByRole("button", { name: "Copy Trader" }).click();
    await expect(page.getByTestId("copy-trader-desk")).toBeVisible();
    await expect(page.getByText("Copy controls")).toBeVisible();

    await nav.getByRole("button", { name: "Edging", exact: true }).click();
    await expect(page.getByTestId("edging-desk")).toBeVisible();

    await nav.getByRole("button", { name: "Edging 2", exact: true }).click();
    await expect(page.getByTestId("edging-2-desk")).toBeVisible();

    await nav.getByRole("button", { name: "Fast Trader" }).click();
    await expect(page.getByTestId("fast-trader-desk")).toBeVisible();

    await nav.getByRole("button", { name: "Charts" }).click();
    await expect(page.getByTestId("chart-desk")).toBeVisible();

    await nav.getByRole("button", { name: "Ultimate Bot" }).click();
    await expect(page.getByTestId("ultimate-bot-desk")).toBeVisible();

    await nav.getByRole("button", { name: "Bulk Trader" }).click();
    await expect(page.getByTestId("bulk-trader-desk")).toBeVisible();

    await nav.getByRole("button", { name: "Free Bots" }).click();
    await expect(page.getByRole("heading", { name: /bots:/i })).toBeVisible();

    await nav.getByRole("button", { name: "Dashboard" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your bot desk",
    );
  });

  test("Speed Bot window opens builder with a seeded strategy", async ({ page }) => {
    await page.goto("/");
    await clickDashboardWindow(page, "Speed Bot");
    await expect(page.getByTestId("bot-builder-desk")).toBeVisible();
    await expect(
      page.locator(".bot-builder-status-chip").filter({ hasText: "Dashboard · Speed Bot" }),
    ).toBeVisible();
  });

  test("trader log in goes to TradeCity, sign up goes to Deriv", async ({ page }) => {
    await page.goto("/");
    const signup = page.getByRole("link", { name: "Sign up" }).first();
    await expect(signup).toHaveAttribute("href", /hub\.deriv\.com\/tradershub\/signup/);
    await expect(signup).toHaveAttribute("target", "_blank");

    await page.getByRole("link", { name: "Log in" }).first().click();
    await expect(page).toHaveURL(/\/login/);
    const oauth = page.getByRole("link", { name: "Log in with Deriv" });
    await expect(oauth).toHaveAttribute("href", "/api/auth/login");
    await expect(oauth).toHaveAttribute("target", "_blank");
    const loginSignup = page.getByRole("link", { name: "Sign up" });
    await expect(loginSignup).toHaveAttribute(
      "href",
      /hub\.deriv\.com\/tradershub\/signup/,
    );
    await expect(loginSignup).toHaveAttribute("target", "_blank");
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
    await expect(workspaceMain(page).getByText("Load Bot")).toBeVisible();
    await expect(workspaceMain(page).getByText("Analysis tool")).toBeVisible();
    await expect(page.getByRole("button", { name: /Switch to (dark|light) theme/i })).toBeVisible();
    const loginid = page.locator(".tc-loginid");
    if ((await loginid.count()) > 0) {
      await expect(page.getByTestId("tc-account-switch")).toBeVisible();
      await expect(page.getByRole("button", { name: "Demo", exact: true })).toBeVisible();
      await expect(page.getByTestId("tc-account-switch").getByText("Real", { exact: true })).toBeVisible();
      await expect(page.getByTestId("tc-account-balance")).toContainText("USD", {
        timeout: 15_000,
      });
    } else {
      await expect(page.getByTestId("tc-account-switch")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
    }
  });

  test("product nav includes Copy Trader", async ({ page }) => {
    await waitForLiveConnection(page);
    await expect(platformNav(page).getByRole("button", { name: "Copy Trader" })).toBeVisible();
  });

  test("dashboard windows open the matching desks", async ({ page }) => {
    await waitForLiveConnection(page);

    await clickDashboardWindow(page, "Speed Bot");
    await expect(page.getByTestId("bot-builder-desk")).toBeVisible();
    await expect(
      page.locator(".bot-builder-status-chip").filter({ hasText: "Dashboard · Speed Bot" }),
    ).toBeVisible();

    await platformNav(page).getByRole("button", { name: "Dashboard" }).click();
    await clickDashboardWindow(page, "Analysis tool");
    await expect(page.getByText("DCIRCLE")).toBeVisible();

    await platformNav(page).getByRole("button", { name: "Dashboard" }).click();
    await clickDashboardWindow(page, "Premium Bots");
    await expect(page.getByRole("heading", { name: /Premium bots:/i })).toBeVisible();

    await platformNav(page).getByRole("button", { name: "Dashboard" }).click();
    await clickDashboardWindow(page, "Free bots");
    await expect(page.getByRole("heading", { name: /Free bots:/i })).toBeVisible();
  });

  test("invalid XML stays on the desk with an error", async ({ page }) => {
    await waitForLiveConnection(page);
    await workspaceMain(page)
      .locator(".terminal-home-window")
      .filter({ hasText: "Load Bot" })
      .click();
    const loadDialog = page.getByRole("dialog", { name: "Load Bot" });
    await expect(loadDialog).toBeVisible();
    await expect(loadDialog.getByText("My computer", { exact: true })).toBeVisible();
    await expect(loadDialog.getByText("Google Drive", { exact: true })).toBeVisible();
    await expect(loadDialog.getByText("Bot builder", { exact: true })).toBeVisible();
    await expect(loadDialog.getByText("Quick strategy", { exact: true })).toBeVisible();
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      loadDialog.getByText("My computer", { exact: true }).click(),
    ]);
    await chooser.setFiles({
      name: "broken.xml",
      mimeType: "text/xml",
      buffer: Buffer.from("<strategy/>"),
    });
    await expect(workspaceMain(page).getByRole("alert")).toContainText(
      "not a TradeCity strategy",
    );
    await expect(
      workspaceMain(page).getByRole("heading", { name: /Demo desk|Live desk|Your desk/ }),
    ).toBeVisible();
  });

  test("navbar theme toggles dark and light", async ({ page }) => {
    await waitForLiveConnection(page);
    const html = page.locator("html");
    const initial = await html.getAttribute("data-theme");
    await page.getByRole("button", { name: /Switch to (dark|light) theme/i }).click();
    await expect(html).not.toHaveAttribute("data-theme", initial ?? "");
  });

  test("brand lockup returns to marketing website", async ({ page }) => {
    await waitForLiveConnection(page);
    await page.locator("a.tc-brand").click();
    await expect(page).toHaveURL(/\/(?:$|\?|#)/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your bot desk",
    );
  });
});
