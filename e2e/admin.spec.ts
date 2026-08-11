import { expect, test } from "@playwright/test";
import {
  openSettings,
  waitForLiveConnection,
} from "./helpers";

const ADMIN_SECRET = "e2e-test-admin-secret-min-32-chars!!";

const sampleAgent = {
  id: "e2e-test-agent",
  name: "E2E Test Agent",
  country: "KE",
  methods: ["M-Pesa"],
  active: false,
  website: "https://example.com",
};

test.describe("Admin API", () => {
  test("GET rejects missing authorization", async ({ request }) => {
    const response = await request.get("/api/admin/agents");
    expect(response.status()).toBe(401);
  });

  test("GET rejects invalid token", async ({ request }) => {
    const response = await request.get("/api/admin/agents", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(response.status()).toBe(401);
  });

  test("PUT rejects invalid agent payload", async ({ request }) => {
    const response = await request.put("/api/admin/agents", {
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
        "Content-Type": "application/json",
      },
      data: {
        agents: [
          {
            id: "bad",
            name: "",
            country: "XX",
            methods: [],
            active: true,
          },
        ],
      },
    });
    expect(response.status()).toBe(400);
    const json = (await response.json()) as { error?: string };
    expect(json.error).toBe("Validation failed");
  });

  test("PUT save and GET load round trip", async ({ request }) => {
    const put = await request.put("/api/admin/agents", {
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
        "Content-Type": "application/json",
      },
      data: { agents: [sampleAgent] },
    });
    expect(put.ok()).toBeTruthy();

    const get = await request.get("/api/admin/agents", {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    expect(get.ok()).toBeTruthy();
    const json = (await get.json()) as {
      agents: Array<{ id: string; name: string }>;
    };
    expect(json.agents.some((a) => a.id === sampleAgent.id)).toBeTruthy();
    expect(json.agents.find((a) => a.id === sampleAgent.id)?.name).toBe(
      sampleAgent.name,
    );
  });
});

test.describe("Admin UI", () => {
  test("connect gate renders", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Partner agent studio")).toBeVisible();
    await expect(page.getByPlaceholder("Paste ADMIN_SECRET value")).toBeVisible();
  });
});

test.describe("Admin copy providers API", () => {
  test.describe.configure({ mode: "serial" });

  const sampleProvider = {
    id: "e2e-test-provider",
    name: "E2E Test Provider",
    country: "KE",
    bio: "E2E copy provider listing",
    style: "momentum" as const,
    symbols: ["R_10"],
    demoWinRate: 55,
    demoSignals30d: 12,
    verified: false,
    riskLabel: "medium" as const,
    active: false,
  };

  test("GET rejects missing authorization", async ({ request }) => {
    const response = await request.get("/api/admin/copy-providers");
    expect(response.status()).toBe(401);
  });

  test("PUT save and GET load round trip", async ({ request }) => {
    const put = await request.put("/api/admin/copy-providers", {
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
        "Content-Type": "application/json",
      },
      data: { providers: [sampleProvider] },
    });
    expect(put.ok()).toBeTruthy();

    const get = await request.get("/api/admin/copy-providers", {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    expect(get.ok()).toBeTruthy();
    const json = (await get.json()) as {
      providers: Array<{ id: string; name: string }>;
    };
    expect(json.providers.some((p) => p.id === sampleProvider.id)).toBeTruthy();
  });

  test("public copy providers returns registry entries", async ({ request }) => {
    await request.put("/api/admin/copy-providers", {
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
        "Content-Type": "application/json",
      },
      data: {
        providers: [{ ...sampleProvider, id: "public-copy-provider", active: true }],
      },
    });

    const response = await request.get("/api/copy/providers");
    expect(response.ok()).toBeTruthy();
    const json = (await response.json()) as {
      providers: Array<{ id: string }>;
      source: string;
    };
    expect(json.source).toBe("registry");
    expect(json.providers.some((p) => p.id === "public-copy-provider")).toBeTruthy();
  });
});

test.describe("Admin copy UI", () => {
  test("connect gate renders", async ({ page }) => {
    await page.goto("/admin/copy");
    await expect(
      page.getByRole("heading", { name: "Curate signal desks" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder("Paste ADMIN_SECRET value")).toBeVisible();
  });
});

test.describe("Wallet partner disclosure", () => {
  test("settings links to partner studio", async ({ page }) => {
    await waitForLiveConnection(page);
    await openSettings(page);
    await expect(page.getByRole("link", { name: /Partner studio/i })).toHaveAttribute(
      "href",
      "/admin",
    );
    await expect(page.getByRole("link", { name: /Copy provider studio/i })).toHaveAttribute(
      "href",
      "/admin/copy",
    );
  });

  test("wallet registry exposes active partner agents", async ({ request }) => {
    const put = await request.put("/api/admin/agents", {
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
        "Content-Type": "application/json",
      },
      data: {
        agents: [{ ...sampleAgent, id: "wallet-disclosure-agent", active: true }],
      },
    });
    expect(put.ok()).toBeTruthy();

    const agentsRes = await request.get("/api/payments/agents?country=KE");
    expect(agentsRes.ok()).toBeTruthy();
    const agentsJson = (await agentsRes.json()) as {
      agents: Array<{ id: string; source?: string }>;
      source: string;
    };
    expect(agentsJson.source).toMatch(/partners/);
    expect(
      agentsJson.agents.some(
        (a) => a.id === "wallet-disclosure-agent" && a.source === "partner",
      ),
    ).toBeTruthy();
  });
});
