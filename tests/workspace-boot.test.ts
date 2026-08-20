import { afterEach, describe, expect, it, vi } from "vitest";
import { LAST_WORKSPACE_KEY } from "@/lib/terminal/last-workspace";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

function stubBrowser(hash: string, lastWorkspace?: string | null) {
  const store = new Map<string, string>();
  if (lastWorkspace) store.set(LAST_WORKSPACE_KEY, lastWorkspace);
  vi.stubGlobal("window", {
    location: { hash, pathname: "/dashboard", search: "" },
    history: { replaceState: vi.fn() },
  });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  });
}

describe("workspace hash", () => {
  it("maps dashboard to #overview and desks to their own ids", async () => {
    const { hashSegmentForView } = await import("@/lib/navigation/workspace-boot");
    expect(hashSegmentForView("dashboard")).toBe("overview");
    expect(hashSegmentForView("bulk-trader")).toBe("bulk-trader");
    expect(hashSegmentForView("settings")).toBe("settings");
  });

  it("reads a desk hash instead of falling back to dashboard", async () => {
    stubBrowser("#bulk-trader");
    const { viewFromLocationHash, resolveLandingView, resolveDashboardView } =
      await import("@/lib/navigation/workspace-boot");
    expect(viewFromLocationHash()).toBe("bulk-trader");
    expect(resolveLandingView()).toBe("bulk-trader");
    expect(resolveDashboardView()).toBe("bulk-trader");
  });

  it("treats #overview as dashboard", async () => {
    stubBrowser("#overview");
    const { viewFromLocationHash, resolveDashboardView } = await import(
      "@/lib/navigation/workspace-boot"
    );
    expect(viewFromLocationHash()).toBe("dashboard");
    expect(resolveDashboardView()).toBe("dashboard");
  });

  it("falls back to the last desk when the hash is empty", async () => {
    stubBrowser("", "chart");
    const { resolveDashboardView } = await import("@/lib/navigation/workspace-boot");
    expect(resolveDashboardView()).toBe("chart");
  });
});
