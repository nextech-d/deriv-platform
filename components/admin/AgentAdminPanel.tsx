"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { AdminCatalogSidebar } from "@/components/admin/AdminCatalogSidebar";
import { AdminConnectGate } from "@/components/admin/AdminConnectGate";
import { AdminStudioChrome } from "@/components/admin/AdminStudioChrome";
import { AdminStatusBar } from "@/components/admin/AdminStatusBar";
import { AdminStudioSkeleton } from "@/components/admin/AdminStudioSkeleton";
import {
  ADMIN_COUNTRIES,
  ADMIN_TOKEN_KEY,
} from "@/components/admin/constants";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  hasBlockingIssues,
  validateAgent,
} from "@/lib/admin/validate-agent";
import type { PartnerAgent } from "@/lib/payments/agent-registry";
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout";

const AdminStatsSection = dynamic(
  () =>
    import("@/components/admin/AdminStatsBar").then((m) => m.AdminStatsSection),
  { loading: () => null },
);

const AgentEditor = dynamic(
  () =>
    import("@/components/admin/AgentEditor").then((m) => m.AgentEditor),
  {
    loading: () => (
      <div className="h-96 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
    ),
  },
);

const WalletPreviewFrame = dynamic(
  () =>
    import("@/components/admin/WalletPreviewFrame").then(
      (m) => m.WalletPreviewFrame,
    ),
  {
    loading: () => (
      <div className="mx-auto h-[480px] max-w-[340px] animate-pulse rounded-[2rem] bg-surface-elevated" />
    ),
  },
);

function toPaymentAgent(agent: PartnerAgent) {
  const { active, ...rest } = agent;
  void active;
  return rest;
}

export function AgentAdminPanel() {
  const [token, setToken] = useState("");
  const [agents, setAgents] = useState<PartnerAgent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const selectedAgent = agents[selectedIndex] ?? null;

  const agentIssues = useMemo(
    () => new Map(agents.map((a) => [a.id, validateAgent(a)])),
    [agents],
  );

  const selectedIssues = useMemo(
    () => (selectedAgent ? (agentIssues.get(selectedAgent.id) ?? []) : []),
    [selectedAgent, agentIssues],
  );

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents
      .map((agent, index) => ({ agent, index }))
      .filter(({ agent }) => {
        if (countryFilter && agent.country !== countryFilter) return false;
        if (!q) return true;
        return (
          agent.name.toLowerCase().includes(q) ||
          agent.country.toLowerCase().includes(q) ||
          agent.id.toLowerCase().includes(q)
        );
      });
  }, [agents, search, countryFilter]);

  const load = useCallback(async (adminToken: string) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetchWithTimeout("/api/admin/agents", {
        headers: { Authorization: `Bearer ${adminToken}` },
        timeoutMs: 10_000,
      });
      if (!response.ok) {
        setError("Invalid admin token or ADMIN_SECRET not configured on server");
        return;
      }
      const json = (await response.json()) as { agents: PartnerAgent[] };
      setAgents(json.agents);
      setSelectedIndex(json.agents.length > 0 ? 0 : -1);
      setLoaded(true);
      setDirty(false);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("timed out")
          ? "Server not responding — try refreshing or run npm run dev:restart"
          : "Could not load agents — check connection",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const safety = window.setTimeout(() => {
      if (!cancelled) setBootstrapping(false);
    }, 12_000);

    const stored = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (stored) {
      setToken(stored);
      void load(stored).finally(() => {
        if (!cancelled) setBootstrapping(false);
        window.clearTimeout(safety);
      });
    } else {
      setBootstrapping(false);
      window.clearTimeout(safety);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [load]);

  useEffect(() => {
    if (selectedIndex >= agents.length) {
      setSelectedIndex(agents.length > 0 ? agents.length - 1 : -1);
    }
  }, [agents.length, selectedIndex]);

  const handleSave = useCallback(async () => {
    if (!token) return;
    const allIssues = agents.flatMap((a) => validateAgent(a));
    if (hasBlockingIssues(allIssues)) {
      setError("Fix validation errors before saving.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/agents", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agents }),
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as {
          error?: string;
          issues?: Array<{ index: number; id: string; issues: { message: string }[] }>;
        } | null;
        if (json?.issues?.length) {
          const first = json.issues[0];
          const detail = first.issues[0]?.message ?? json.error;
          setError(
            `Save failed${first.index >= 0 ? ` (agent ${first.index + 1})` : ""}: ${detail}`,
          );
        } else {
          setError(json?.error ?? "Save failed — check token and server logs");
        }
        return;
      }
      setDirty(false);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }, [agents, token]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (loaded && dirty) void handleSave();
        return;
      }
      if (!loaded || agents.length === 0) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, agents.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [agents.length, dirty, handleSave, loaded]);

  function markDirty() {
    setDirty(true);
    setSavedAt(null);
  }

  function updateAgent(index: number, patch: Partial<PartnerAgent>) {
    setAgents((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    );
    markDirty();
  }

  function removeAgent(index: number) {
    setAgents((prev) => prev.filter((_, i) => i !== index));
    setDeleteIndex(null);
    markDirty();
  }

  function duplicateAgent(index: number) {
    const source = agents[index];
    setAgents((prev) => [
      ...prev.slice(0, index + 1),
      {
        ...source,
        id: `agent-${Date.now()}`,
        name: `${source.name} (copy)`,
        active: false,
      },
      ...prev.slice(index + 1),
    ]);
    setSelectedIndex(index + 1);
    markDirty();
  }

  function addAgent() {
    setAgents((prev) => [
      ...prev,
      {
        id: `agent-${Date.now()}`,
        name: "New Partner Agent",
        country: countryFilter ?? "KE",
        methods: ["M-Pesa"],
        active: false,
      },
    ]);
    setSelectedIndex(agents.length);
    markDirty();
  }

  function lockSession() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setLoaded(false);
    setAgents([]);
    setToken("");
    setDirty(false);
    setSavedAt(null);
    setSelectedIndex(-1);
    setBootstrapping(false);
  }

  if (bootstrapping) {
    return <AdminStudioSkeleton />;
  }

  if (!loaded) {
    return (
      <AdminConnectGate
        studio="partners"
        token={token}
        loading={loading}
        error={error}
        onTokenChange={setToken}
        onConnect={() => void load(token)}
      />
    );
  }

  const sidebarItems = filteredAgents.map(({ agent, index }) => {
    const country = ADMIN_COUNTRIES.find((c) => c.code === agent.country);
    return {
      id: agent.id,
      name: agent.name,
      flag: country?.flag ?? "🌍",
      countryCode: agent.country,
      active: agent.active,
      hasErrors: hasBlockingIssues(agentIssues.get(agent.id) ?? []),
      index,
    };
  });

  return (
    <div className="admin-shell relative flex h-dvh overflow-hidden bg-background">
      <AdminCatalogSidebar
        studio="partners"
        studioLabel="Partner studio"
        catalogLabel="Payment agents"
        count={agents.length}
        search={search}
        onSearchChange={setSearch}
        countryFilter={countryFilter}
        onCountryFilterChange={setCountryFilter}
        items={sidebarItems}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onAdd={addAgent}
        onLock={lockSession}
        addLabel="New agent"
      />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminStudioChrome
          studio="partners"
          title={selectedAgent?.name ?? "Payment agents"}
          recordId={selectedAgent?.id}
          region={selectedAgent?.country}
          live={selectedAgent?.active}
          dirty={dirty}
          savedAt={savedAt}
          saving={saving}
          onSave={() => void handleSave()}
          catalog={agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            active: agent.active,
            hasErrors: hasBlockingIssues(agentIssues.get(agent.id) ?? []),
          }))}
          selectedId={selectedAgent?.id ?? null}
          onCatalogSelect={(id) => {
            const index = agents.findIndex((agent) => agent.id === id);
            if (index >= 0) setSelectedIndex(index);
          }}
        />

        <div className="admin-workspace min-h-0 flex-1 overflow-y-auto overscroll-y-contain scrollbar-thin">
          <div className="admin-workspace-inner">
          {error ? (
            <p className="workspace-inline-alert workspace-inline-alert-danger mb-3 text-[11px]">
              {error}
            </p>
          ) : null}

          {agents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No agents yet"
              description="Create your first partner listing."
              compact
              action={
                <Button className="interactive" onClick={addAgent}>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Create agent
                </Button>
              }
            />
          ) : selectedAgent ? (
            <div className="mx-auto max-w-[1240px]">
              <div className="admin-desk">
                <AdminStatsSection agents={agents} />
                <div className="admin-desk-columns">
                  <div className="admin-desk-pane admin-desk-pane-editor">
                    <div className="admin-desk-pane-label hidden lg:flex">
                      Editor
                    </div>
                    <div className="admin-desk-pane-body">
                      <AgentEditor
                        agent={selectedAgent}
                        issues={selectedIssues}
                        onChange={(patch) => updateAgent(selectedIndex, patch)}
                        onDuplicate={() => duplicateAgent(selectedIndex)}
                        onDelete={() => setDeleteIndex(selectedIndex)}
                      />
                    </div>
                  </div>

                  <div className="admin-desk-pane admin-desk-pane-preview">
                    <div className="admin-desk-pane-label hidden lg:flex">
                      Wallet preview
                    </div>
                    <div className="admin-desk-pane-body admin-desk-preview-body">
                      <WalletPreviewFrame
                        agent={toPaymentAgent(selectedAgent)}
                        active={selectedAgent.active}
                        highlightId={selectedAgent.id}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>

        {dirty ? (
          <AdminStatusBar
            hints={[
              { keys: "⌘S", label: "save" },
              { keys: "j k", label: "navigate listings" },
            ]}
          />
        ) : null}
      </div>

      {deleteIndex !== null && agents[deleteIndex] ? (
        <DeleteConfirmDialog
          agentName={agents[deleteIndex].name}
          onConfirm={() => removeAgent(deleteIndex)}
          onCancel={() => setDeleteIndex(null)}
        />
      ) : null}
    </div>
  );
}
