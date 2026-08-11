"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Radio } from "lucide-react";
import { AdminCatalogSidebar } from "@/components/admin/AdminCatalogSidebar";
import { AdminConnectGate } from "@/components/admin/AdminConnectGate";
import { AdminStudioChrome } from "@/components/admin/AdminStudioChrome";
import { AdminStatusBar } from "@/components/admin/AdminStatusBar";
import { AdminStudioSkeleton } from "@/components/admin/AdminStudioSkeleton";
import { ADMIN_COUNTRIES, ADMIN_TOKEN_KEY } from "@/components/admin/constants";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  hasBlockingCopyIssues,
  validateCopyProvider,
} from "@/lib/admin/validate-copy-provider";
import type { CopyProviderRecord } from "@/lib/copy/provider-registry";
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout";

const CopyProviderEditor = dynamic(
  () =>
    import("@/components/admin/CopyProviderEditor").then(
      (m) => m.CopyProviderEditor,
    ),
  {
    loading: () => (
      <div className="h-96 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
    ),
  },
);

function defaultProvider(country = "KE"): CopyProviderRecord {
  return {
    id: `provider-${Date.now()}`,
    name: "New Signal Provider",
    country,
    bio: "",
    style: "momentum",
    symbols: ["R_10"],
    demoWinRate: 50,
    demoSignals30d: 0,
    verified: false,
    riskLabel: "medium",
    active: false,
  };
}

export function CopyProviderAdminPanel() {
  const [token, setToken] = useState("");
  const [providers, setProviders] = useState<CopyProviderRecord[]>([]);
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

  const selectedProvider = providers[selectedIndex] ?? null;

  const providerIssues = useMemo(
    () => new Map(providers.map((p) => [p.id, validateCopyProvider(p)])),
    [providers],
  );

  const selectedIssues = useMemo(
    () =>
      selectedProvider ? (providerIssues.get(selectedProvider.id) ?? []) : [],
    [selectedProvider, providerIssues],
  );

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return providers
      .map((provider, index) => ({ provider, index }))
      .filter(({ provider }) => {
        if (countryFilter && provider.country !== countryFilter) return false;
        if (!q) return true;
        return (
          provider.name.toLowerCase().includes(q) ||
          provider.country.toLowerCase().includes(q) ||
          provider.id.toLowerCase().includes(q)
        );
      });
  }, [providers, search, countryFilter]);

  const load = useCallback(async (adminToken: string) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetchWithTimeout("/api/admin/copy-providers", {
        headers: { Authorization: `Bearer ${adminToken}` },
        timeoutMs: 10_000,
      });
      if (!response.ok) {
        setError("Invalid admin token or ADMIN_SECRET not configured on server");
        return;
      }
      const json = (await response.json()) as { providers: CopyProviderRecord[] };
      setProviders(json.providers);
      setSelectedIndex(json.providers.length > 0 ? 0 : -1);
      setLoaded(true);
      setDirty(false);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("timed out")
          ? "Server not responding — try refreshing or run npm run dev:restart"
          : "Could not load copy providers — check connection",
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
    if (selectedIndex >= providers.length) {
      setSelectedIndex(providers.length > 0 ? providers.length - 1 : -1);
    }
  }, [providers.length, selectedIndex]);

  const handleSave = useCallback(async () => {
    if (!token) return;
    const allIssues = providers.flatMap((p) => validateCopyProvider(p));
    if (hasBlockingCopyIssues(allIssues)) {
      setError("Fix validation errors before saving.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/copy-providers", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providers }),
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
            `Save failed${first.index >= 0 ? ` (provider ${first.index + 1})` : ""}: ${detail}`,
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
  }, [providers, token]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (loaded && dirty) void handleSave();
        return;
      }
      if (!loaded || providers.length === 0) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, providers.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dirty, handleSave, loaded, providers.length]);

  function markDirty() {
    setDirty(true);
    setSavedAt(null);
  }

  function updateProvider(index: number, patch: Partial<CopyProviderRecord>) {
    setProviders((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
    markDirty();
  }

  function removeProvider(index: number) {
    setProviders((prev) => prev.filter((_, i) => i !== index));
    setDeleteIndex(null);
    markDirty();
  }

  function duplicateProvider(index: number) {
    const source = providers[index];
    setProviders((prev) => [
      ...prev.slice(0, index + 1),
      {
        ...source,
        id: `provider-${Date.now()}`,
        name: `${source.name} (copy)`,
        active: false,
      },
      ...prev.slice(index + 1),
    ]);
    setSelectedIndex(index + 1);
    markDirty();
  }

  function addProvider() {
    setProviders((prev) => [...prev, defaultProvider(countryFilter ?? "KE")]);
    setSelectedIndex(providers.length);
    markDirty();
  }

  function lockSession() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setLoaded(false);
    setProviders([]);
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
        studio="copy"
        token={token}
        loading={loading}
        error={error}
        onTokenChange={setToken}
        onConnect={() => void load(token)}
      />
    );
  }

  const sidebarItems = filteredProviders.map(({ provider, index }) => {
    const country = ADMIN_COUNTRIES.find((c) => c.code === provider.country);
    return {
      id: provider.id,
      name: provider.name,
      flag: country?.flag ?? "🌍",
      countryCode: provider.country,
      active: provider.active,
      hasErrors: hasBlockingCopyIssues(providerIssues.get(provider.id) ?? []),
      index,
    };
  });

  return (
    <div className="admin-shell relative flex h-dvh overflow-hidden bg-background">
      <AdminCatalogSidebar
        studio="copy"
        studioLabel="Copy studio"
        catalogLabel="Signal providers"
        count={providers.length}
        search={search}
        onSearchChange={setSearch}
        countryFilter={countryFilter}
        onCountryFilterChange={setCountryFilter}
        items={sidebarItems}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onAdd={addProvider}
        onLock={lockSession}
        addLabel="New provider"
      />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminStudioChrome
          studio="copy"
          title={selectedProvider?.name ?? "Signal providers"}
          recordId={selectedProvider?.id}
          region={selectedProvider?.country}
          live={selectedProvider?.active}
          dirty={dirty}
          savedAt={savedAt}
          saving={saving}
          onSave={() => void handleSave()}
          catalog={providers.map((provider) => ({
            id: provider.id,
            name: provider.name,
            active: provider.active,
            hasErrors: hasBlockingCopyIssues(
              providerIssues.get(provider.id) ?? [],
            ),
          }))}
          selectedId={selectedProvider?.id ?? null}
          onCatalogSelect={(id) => {
            const index = providers.findIndex((provider) => provider.id === id);
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

          {providers.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="No providers yet"
              description="Create your first copy-trading desk listing."
              compact
              action={
                <Button className="interactive" onClick={addProvider}>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Create provider
                </Button>
              }
            />
          ) : selectedProvider ? (
            <div className="mx-auto max-w-[960px]">
              <div className="admin-desk">
                <div className="admin-desk-pane admin-desk-pane-editor">
                  <div className="admin-desk-pane-label hidden lg:flex">
                    Provider editor
                  </div>
                  <div className="admin-desk-pane-body">
                    <CopyProviderEditor
                      provider={selectedProvider}
                      issues={selectedIssues}
                      onChange={(patch) => updateProvider(selectedIndex, patch)}
                      onDuplicate={() => duplicateProvider(selectedIndex)}
                      onDelete={() => setDeleteIndex(selectedIndex)}
                    />
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

      {deleteIndex !== null && providers[deleteIndex] ? (
        <DeleteConfirmDialog
          agentName={providers[deleteIndex].name}
          onConfirm={() => removeProvider(deleteIndex)}
          onCancel={() => setDeleteIndex(null)}
        />
      ) : null}
    </div>
  );
}
