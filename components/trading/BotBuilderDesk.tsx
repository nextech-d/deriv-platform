"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  CandlestickChart,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  LineChart,
  Play,
  Redo2,
  RefreshCw,
  Save,
  Search,
  Square,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  BOT_BUILDER_FLYOUT_HELP,
  BOT_BUILDER_FLYOUT_LEARN,
  BOT_BUILDER_STATS_HELP,
  BOT_BUILDER_TOOLBOX,
  type BuilderBlockDef,
  type BuilderCategoryId,
} from "@/lib/terminal/bot-builder";
import {
  DEFAULT_BUILDER_SNAPSHOT,
  snapshotFromXml,
  snapshotToBotConfig,
  snapshotToXml,
  symbolFromMarketLabel,
  BUILDER_TRADE_TYPES,
  DURATION_RULES,
  clampSnapshotDuration,
  defaultQuickParams,
  durationBounds,
  normalizeLoadedSnapshot,
  normalizePurchase,
  purchasesForTradeType,
  workspaceChipsForSnapshot,
  type BotBuilderSnapshot,
  type BuilderTradeType,
} from "@/lib/terminal/strategy-seed";
import { TourDialog } from "@/components/trading/TourDialog";
import { DriveFileDialog } from "@/components/trading/LoadBotSourceGrid";
import { BuilderBlocklyBlocks } from "@/components/trading/BuilderBlocklyBlocks";
import { QuickStrategyStudio } from "@/components/trading/QuickStrategyStudio";
import {
  consumeBuilderHandoff,
  consumeBuilderRunAfter,
  readBuilderWorkspace,
  writeBuilderWorkspace,
  clearBuilderWorkspace,
} from "@/lib/terminal/desk-handoff";
import { effectForBuilderBlock, type BuilderLane } from "@/lib/terminal/builder-block-map";
import type { BotConfig } from "@/lib/bot/types";
import { lastDigitFromQuote } from "@/lib/terminal/analysis-tool";
import { formatWalletBalance } from "@/lib/utils/format-wallet";
import type { OpenContractRecord } from "@/lib/state/types";
import type { TickEvent } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils/cn";

type SummaryTab = "summary" | "transactions" | "journal";
type FocusBlock = BuilderLane;

interface CanvasChip {
  id: string;
  label: string;
  category: string;
  lane: FocusBlock;
}

interface JournalEntry {
  id: string;
  at: number;
  text: string;
}

interface BotBuilderDeskProps {
  seed?: BotBuilderSnapshot | null;
  seedKey?: number;
  onOpenAiBot?: () => void;
  onRun?: (config: BotConfig, snapshot: BotBuilderSnapshot) => void;
  onStop?: () => void;
  running?: boolean;
  blockReason?: string | null;
  lastQuote?: number | null;
  balance?: { amount: number; currency: string } | null;
  accountCurrency?: string;
  onSymbolChange?: (symbol: string) => void;
  fills?: OpenContractRecord[];
  runStats?: {
    totalStake: number;
    totalPayout: number;
    runs: number;
    lost: number;
    won: number;
    pnl: number;
  };
  recentJournal?: string[];
  tickHistory?: TickEvent[];
}

const TOOLBAR_ICONS = {
  reset: RefreshCw,
  import: FolderOpen,
  save: Save,
  sort: AlignLeft,
  charts: LineChart,
  tradingview: CandlestickChart,
  undo: Undo2,
  redo: Redo2,
  "zoom-in": ZoomIn,
  "zoom-out": ZoomOut,
} as const;

const TOOLBAR_STRIP: Array<
  | { kind: "btn"; id: keyof typeof TOOLBAR_ICONS; label: string }
  | { kind: "div" }
> = [
  { kind: "btn", id: "reset", label: "Reset" },
  { kind: "btn", id: "import", label: "Import" },
  { kind: "btn", id: "save", label: "Save" },
  { kind: "btn", id: "sort", label: "Sort blocks" },
  { kind: "div" },
  { kind: "btn", id: "charts", label: "Charts" },
  { kind: "btn", id: "tradingview", label: "TradingView Chart" },
  { kind: "div" },
  { kind: "btn", id: "undo", label: "Undo" },
  { kind: "btn", id: "redo", label: "Redo" },
  { kind: "div" },
  { kind: "btn", id: "zoom-in", label: "Zoom in" },
  { kind: "btn", id: "zoom-out", label: "Zoom out" },
];

function botFileName(name: string) {
  const slug = name.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "strategy";
  return `${slug}.xml`;
}

const ALL_TRADE_TYPES = Object.keys(BUILDER_TRADE_TYPES) as BuilderTradeType[];

function chipsFromSnapshot(snapshot: BotBuilderSnapshot): CanvasChip[] {
  return workspaceChipsForSnapshot(snapshot).map((chip, index) => ({
    id: `${chip.lane}-${index}-${chip.label}`,
    ...chip,
  }));
}

export function BotBuilderDesk({
  seed = null,
  seedKey = 0,
  onRun,
  onStop,
  running = false,
  blockReason = null,
  lastQuote = null,
  balance = null,
  accountCurrency = "USD",
  onSymbolChange,
  fills = [],
  runStats,
  recentJournal = [],
  tickHistory = [],
}: BotBuilderDeskProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const driveFileRef = useRef<HTMLInputElement>(null);
  const skipFirstSeed = useRef(Boolean(seed));
  const onSymbolChangeRef = useRef(onSymbolChange);
  onSymbolChangeRef.current = onSymbolChange;

  const booted = useMemo(() => {
    if (seed) {
      const snapshot = normalizeLoadedSnapshot(seed);
      return {
        snapshot,
        chips: chipsFromSnapshot(snapshot),
        journal: [] as JournalEntry[],
        history: [snapshot],
        historyIndex: 0,
        focusBlock: "trade" as FocusBlock,
      };
    }
    const saved = readBuilderWorkspace();
    if (saved?.snapshot) {
      const snapshot = normalizeLoadedSnapshot(saved.snapshot);
      return {
        snapshot,
        chips: saved.chips ?? [],
        journal: saved.journal ?? [],
        history: saved.history?.length ? saved.history : [snapshot],
        historyIndex: saved.historyIndex ?? 0,
        focusBlock: saved.focusBlock ?? "trade",
      };
    }
    return {
      snapshot: DEFAULT_BUILDER_SNAPSHOT,
      chips: [] as CanvasChip[],
      journal: [] as JournalEntry[],
      history: [DEFAULT_BUILDER_SNAPSHOT],
      historyIndex: 0,
      focusBlock: "trade" as FocusBlock,
    };
  }, []);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<BuilderCategoryId>("trade-parameters");
  const [summaryTab, setSummaryTab] = useState<SummaryTab>("summary");
  const [focusBlock, setFocusBlock] = useState<FocusBlock>(booted.focusBlock);
  const [snapshot, setSnapshot] = useState<BotBuilderSnapshot>(booted.snapshot);
  const [history, setHistory] = useState<BotBuilderSnapshot[]>(booted.history);
  const [historyIndex, setHistoryIndex] = useState(booted.historyIndex);
  const [journal, setJournal] = useState<JournalEntry[]>(booted.journal);
  const [chips, setChips] = useState<CanvasChip[]>(booted.chips);
  const [compactLayout, setCompactLayout] = useState(false);
  const [notice, setNotice] = useState("Pick a category, then click a block in the flyout");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [openGroup, setOpenGroup] = useState<{ cat: string; group: string } | null>(null);
  const [vhOpen, setVhOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [loadTab, setLoadTab] = useState<"recent" | "local" | "drive">("recent");
  const [driveOpen, setDriveOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("Untitled Bot");
  const [saveTarget, setSaveTarget] = useState<"local" | "drive">("local");
  const [chartOpen, setChartOpen] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);
  const [statsHelpOpen, setStatsHelpOpen] = useState(false);
  const [recentWhyOpen, setRecentWhyOpen] = useState(false);
  const [flash, setFlash] = useState<{ tone: "ok" | "run"; text: string } | null>(null);
  const [blocksMenuOpen, setBlocksMenuOpen] = useState(true);
  const [flyoutLearnOpen, setFlyoutLearnOpen] = useState(false);
  const [loadDragging, setLoadDragging] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem("tc-tour-builder")) setTourOpen(true);
  }, []);

  function toggleExpanded(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    const handed = consumeBuilderHandoff();
    const runAfter = consumeBuilderRunAfter();
    if (skipFirstSeed.current) {
      skipFirstSeed.current = false;
      if (seed) {
        if (runAfter) {
          installBot(seed, `${seed.sourceLabel} generated on the workspace`, true);
        } else {
          onSymbolChangeRef.current?.(seed.symbol);
          setVhOpen(Boolean(seed.virtualHook));
          const text = `${seed.sourceLabel} ready on the workspace`;
          setNotice(text);
          setFlash({ tone: "ok", text });
        }
      }
      return;
    }
    const next = seed ?? handed;
    if (!next) return;
    installBot(next, `${next.sourceLabel} ready on the workspace`, runAfter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  useEffect(() => {
    writeBuilderWorkspace({
      snapshot,
      chips,
      journal,
      history,
      historyIndex,
      focusBlock,
    });
  }, [snapshot, chips, journal, history, historyIndex, focusBlock]);

  useEffect(() => {
    if (blockReason) setNotice(blockReason);
  }, [blockReason]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4_500);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!recentJournal.length) return;
    setJournal((prev) =>
      [
        ...recentJournal.map((text, index) => ({
          id: `ext-${index}-${text}`,
          at: Date.now() - index * 1000,
          text,
        })),
        ...prev,
      ].slice(0, 40),
    );
  }, [recentJournal]);

  function pushHistory(next: BotBuilderSnapshot) {
    setHistory((prev) => {
      const clipped = prev.slice(0, historyIndex + 1);
      const updated = [...clipped, next].slice(-40);
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }

  function applySnapshot(next: BotBuilderSnapshot, journalText?: string, replace = false) {
    const normalized = normalizeLoadedSnapshot(next);
    setSnapshot(normalized);
    if (replace) {
      setHistory([normalized]);
      setHistoryIndex(0);
    } else {
      pushHistory(normalized);
    }
    if (journalText) {
      setJournal((prev) =>
        [{ id: crypto.randomUUID(), at: Date.now(), text: journalText }, ...prev].slice(
          0,
          40,
        ),
      );
    }
    if (normalized.symbol) onSymbolChangeRef.current?.(normalized.symbol);
  }

  function installBot(next: BotBuilderSnapshot, message: string, thenRun = false) {
    const normalized = normalizeLoadedSnapshot(next);
    applySnapshot(normalized, message, true);
    setChips(chipsFromSnapshot(normalized));
    setVhOpen(Boolean(normalized.virtualHook));
    setFocusBlock("trade");
    setNotice(message);
    if (thenRun) {
      onRun?.(snapshotToBotConfig(normalized), normalized);
      onSymbolChangeRef.current?.(normalized.symbol);
      setSummaryTab("journal");
      const runningText = `Bot running · ${normalized.purchase} ${normalized.tradeType} · ${normalized.market}`;
      setNotice(runningText);
      setFlash({ tone: "run", text: runningText });
      log(`Run · ${normalized.tradeType} · ${normalized.symbol}`);
      return;
    }
    setFlash({ tone: "ok", text: message });
  }

  function patchSnapshot(partial: Partial<BotBuilderSnapshot>, journalText?: string) {
    const next: BotBuilderSnapshot = {
      ...snapshot,
      ...partial,
      symbol: partial.symbol ?? (partial.market != null
          ? symbolFromMarketLabel(partial.market)
          : snapshot.symbol),
    };
    if (partial.tradeType && partial.tradeType !== snapshot.tradeType) {
      next.purchase = purchasesForTradeType(partial.tradeType)[0]!;
      next.botStrategy =
        partial.tradeType === "Even/Odd"
          ? "parity_bias"
          : partial.tradeType === "Over/Under"
            ? "barrier_edge"
            : partial.tradeType === "Matches"
              ? "digit_match"
              : snapshot.botStrategy === "parity_bias" ||
                  snapshot.botStrategy === "barrier_edge" ||
                  snapshot.botStrategy === "digit_match"
                ? "ma_cross"
                : snapshot.botStrategy;
    }
    if (partial.contractType === "Call") {
      next.purchase = purchasesForTradeType(next.tradeType)[0]!;
    } else if (partial.contractType === "Put") {
      next.purchase = purchasesForTradeType(next.tradeType)[1]!;
    }
    if (partial.virtualHook === true && !next.quickStrategy) {
      next.quickStrategy = defaultQuickParams("martingale");
      setVhOpen(true);
    }
    if (partial.virtualHook === false) {
      next.quickStrategy = undefined;
      setVhOpen(false);
    }
    next.purchase = normalizePurchase(next.tradeType, next.purchase);
    applySnapshot(clampSnapshotDuration(next), journalText);
  }

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BOT_BUILDER_TOOLBOX;
    return BOT_BUILDER_TOOLBOX.map((cat) => {
      if (cat.label.toLowerCase().includes(q)) return cat;
      return {
        ...cat,
        blocks: cat.blocks.filter(
          (block) =>
            block.label.toLowerCase().includes(q) ||
            (block.hint?.toLowerCase().includes(q) ?? false),
        ),
      };
    }).filter((cat) => cat.label.toLowerCase().includes(q) || cat.blocks.length > 0);
  }, [query]);

  const activeCat =
    categories.find((cat) => cat.id === activeCategory) ?? categories[0] ?? null;

  function log(text: string) {
    setJournal((prev) =>
      [{ id: crypto.randomUUID(), at: Date.now(), text }, ...prev].slice(0, 40),
    );
  }

  function placeBlock(block: BuilderBlockDef) {
    if (running) {
      setNotice("Stop the bot to edit blocks");
      return;
    }
    const categoryLabel = activeCat?.label ?? "Blocks";
    const lastDigit =
      lastQuote != null ? lastDigitFromQuote(lastQuote) : snapshot.digitTarget;
    const effect = effectForBuilderBlock(block, {
      snapshot,
      lastDigit,
      balance,
    });

    setChips((prev) =>
      [
        {
          id: `${block.id}-${Date.now()}`,
          label: block.label,
          category: categoryLabel,
          lane: effect.lane,
        },
        ...prev,
      ].slice(0, 24),
    );

    if (effect.focus) setFocusBlock(effect.focus);
    if (effect.summaryTab) setSummaryTab(effect.summaryTab);
    if (effect.patch) {
      patchSnapshot(effect.patch, effect.journal ?? `Block · ${block.label}`);
    } else if (effect.journal) {
      log(effect.journal);
    }
    setNotice(effect.notice);
    if (!effect.summaryTab) setSummaryTab("journal");
  }

  function downloadStrategy(name: string) {
    const xml = snapshotToXml(snapshot);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = botFileName(name);
    anchor.click();
    URL.revokeObjectURL(url);
    log(`Strategy saved · ${anchor.download}`);
    setNotice("Strategy downloaded");
  }

  function resetWorkspace() {
    clearBuilderWorkspace();
    applySnapshot(DEFAULT_BUILDER_SNAPSHOT, "Workspace reset", true);
    setChips([]);
    setFocusBlock("trade");
    setChartOpen(false);
    setTvOpen(false);
    setNotice("Workspace reset");
  }

  function handleTool(id: keyof typeof TOOLBAR_ICONS) {
    if (id === "reset") {
      setResetOpen(true);
      return;
    }
    if (id === "import") {
      setLoadTab("recent");
      setLoadOpen(true);
      return;
    }
    if (id === "save") {
      setSaveName(snapshot.sourceLabel.replace(/^.*·\s*/, "") || "Untitled Bot");
      setSaveTarget("local");
      setSaveOpen(true);
      return;
    }
    if (id === "sort") {
      setCompactLayout(false);
      patchSnapshot({ zoom: 1 }, "Blocks sorted");
      setNotice("Blocks sorted");
      return;
    }
    if (id === "charts") {
      setTvOpen(false);
      setChartOpen((open) => !open);
      return;
    }
    if (id === "tradingview") {
      setChartOpen(false);
      setTvOpen((open) => !open);
      return;
    }
    if (id === "undo") {
      if (historyIndex <= 0) return;
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setSnapshot(history[nextIndex]!);
      setNotice("Undo");
      return;
    }
    if (id === "redo") {
      if (historyIndex >= history.length - 1) return;
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setSnapshot(history[nextIndex]!);
      setNotice("Redo");
      return;
    }
    if (id === "zoom-out") {
      patchSnapshot({
        zoom: Math.max(0.85, Number((snapshot.zoom - 0.05).toFixed(2))),
      });
      return;
    }
    if (id === "zoom-in") {
      patchSnapshot({
        zoom: Math.min(1.2, Number((snapshot.zoom + 0.05).toFixed(2))),
      });
    }
  }

  function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = snapshotFromXml(String(reader.result ?? ""));
      if (!parsed) {
        setNotice("Could not parse strategy file");
        setFlash({ tone: "ok", text: "Could not parse strategy file" });
        return;
      }
      installBot(
        { ...parsed, sourceLabel: `Loaded · ${file.name}` },
        `Imported ${file.name} onto the workspace`,
      );
      setLoadOpen(false);
      setDriveOpen(false);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
    if (driveFileRef.current) driveFileRef.current.value = "";
    setLoadOpen(false);
    setDriveOpen(false);
  }

  function handleRun() {
    if (running) {
      onStop?.();
      log("Stop");
      setNotice("Bot stopped");
      setFlash({ tone: "ok", text: "Bot stopped" });
      return;
    }
    onRun?.(snapshotToBotConfig(snapshot), snapshot);
    onSymbolChangeRef.current?.(snapshot.symbol);
    log(`Run · ${snapshot.tradeType} · ${snapshot.symbol}`);
    setSummaryTab("journal");
    const text = `Bot running · ${snapshot.purchase} ${snapshot.tradeType} · ${snapshot.market}`;
    setNotice(text);
    setFlash({ tone: "run", text });
  }

  const walletCurrency = balance?.currency ?? accountCurrency;
  const walletLabel = balance
    ? formatWalletBalance(balance.amount, balance.currency)
    : `… ${walletCurrency}`;
  const purchaseOptions = purchasesForTradeType(snapshot.tradeType);
  const stats = [
    { label: "Total stake", value: `${(runStats?.totalStake ?? 0).toFixed(2)} ${walletCurrency}` },
    { label: "Total payout", value: `${(runStats?.totalPayout ?? 0).toFixed(2)} ${walletCurrency}` },
    { label: "No. of runs", value: String(runStats?.runs ?? 0) },
    { label: "Contracts lost", value: String(runStats?.lost ?? 0) },
    { label: "Contracts won", value: String(runStats?.won ?? 0) },
    { label: "Total profit/loss", value: `${(runStats?.pnl ?? 0).toFixed(2)} ${walletCurrency}` },
  ];
  const tradeFamily = ["Rise/Fall", "Higher/Lower"].includes(snapshot.tradeType)
    ? "Up/Down"
    : ["Even/Odd", "Over/Under", "Matches"].includes(snapshot.tradeType)
      ? "Digits"
      : snapshot.tradeType === "Touch/No Touch"
        ? "In/Out"
        : snapshot.tradeType;
  const familyTypes = ALL_TRADE_TYPES.filter((type) => {
    if (["Rise/Fall", "Higher/Lower"].includes(snapshot.tradeType)) {
      return ["Rise/Fall", "Higher/Lower"].includes(type);
    }
    if (["Even/Odd", "Over/Under", "Matches"].includes(snapshot.tradeType)) {
      return ["Even/Odd", "Over/Under", "Matches"].includes(type);
    }
    if (snapshot.tradeType === "Touch/No Touch") return type === "Touch/No Touch";
    return type === snapshot.tradeType;
  });
  const durationRule = DURATION_RULES[snapshot.tradeType];
  const durationLimit = durationBounds(snapshot.tradeType, snapshot.durationUnit);
  const chartTicks = tickHistory
    .filter((tick) => tick.symbol === snapshot.symbol)
    .slice(-80);
  const flyoutBlocks = (() => {
    if (!openGroup) return [];
    const cat = categories.find((item) => item.id === openGroup.cat);
    if (!cat) return [];
    const showAll = openGroup.group === cat.label;
    return cat.blocks.filter((block) => showAll || block.hint === openGroup.group);
  })();

  return (
    <div
      data-testid="bot-builder-desk"
      data-desk
      className="bot-builder"
      data-layout={compactLayout ? "compact" : "expanded"}
    >
      <input
        id="tc-builder-xml-computer"
        ref={fileRef}
        type="file"
        accept=".xml,application/xml,text/xml,application/json"
        className="tc-file-input"
        tabIndex={-1}
        onChange={(event) => handleFile(event.target.files)}
      />
      <input
        id="tc-builder-xml-drive"
        ref={driveFileRef}
        type="file"
        accept=".xml,application/xml,text/xml,application/json"
        className="tc-file-input"
        tabIndex={-1}
        onChange={(event) => handleFile(event.target.files)}
      />

      <p className="bot-builder-live" role="status">
        {notice}
      </p>

      {flash ? (
        <p
          className={cn("bot-builder-flash", flash.tone === "run" && "is-run")}
          role="status"
          data-testid="tc-builder-flash"
        >
          {flash.text}
        </p>
      ) : null}

      <div className="bot-builder-shell">
        <aside className="bot-builder-menu" data-testid="dashboard__toolbox">
          <div className="bot-builder-menu-head">
            <button
              type="button"
              id="db-toolbar__get-started-button"
              className="bot-builder-qs-btn"
              data-testid="tc-builder-qs"
              onClick={() => setQuickOpen(true)}
            >
              Quick strategy
            </button>
            <button
              type="button"
              className="bot-builder-menu-title"
              data-testid="db-toolbox__title"
              aria-expanded={blocksMenuOpen}
              onClick={() => {
                setBlocksMenuOpen((open) => !open);
                if (blocksMenuOpen) setOpenGroup(null);
              }}
            >
              Blocks menu
              {blocksMenuOpen ? <ChevronUp strokeWidth={2} /> : <ChevronDown strokeWidth={2} />}
            </button>
            {blocksMenuOpen ? (
              <label className="bot-builder-search">
                <Search strokeWidth={2} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  aria-label="Search blocks"
                />
              </label>
            ) : null}
          </div>

          {blocksMenuOpen ? (
            <ul className="bot-builder-menu-list" data-scroll-pane>
            {categories.map((item) => {
              const isExp = expandedCategories.has(item.id);
              const isAct = activeCategory === item.id;
              const subGroups = Array.from(
                new Set(item.blocks.map((block) => block.hint).filter(Boolean)),
              ) as string[];
              const showSubmenus = Boolean(item.expandable && subGroups.length > 0);
              const searching = Boolean(query.trim());
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "bot-builder-menu-item",
                      isAct && "bot-builder-menu-item-active",
                      item.accent && "bot-builder-menu-item-accent",
                    )}
                    onClick={() => {
                      setActiveCategory(item.id);
                      setNotice(item.label);
                      if (item.expandable) {
                        toggleExpanded(item.id);
                        setOpenGroup(null);
                      } else {
                        if (item.id === "trade-parameters") setFocusBlock("trade");
                        else if (item.id === "purchase-conditions") setFocusBlock("purchase");
                        else if (item.id === "sell-conditions") setFocusBlock("sell");
                        else if (item.id === "restart-conditions") setFocusBlock("restart");
                        setOpenGroup({ cat: item.id, group: item.label });
                        setFlyoutLearnOpen(false);
                      }
                    }}
                  >
                    <span>{item.label}</span>
                    {item.expandable ? (
                      isExp ? (
                        <ChevronUp strokeWidth={2} />
                      ) : (
                        <ChevronDown strokeWidth={2} />
                      )
                    ) : null}
                  </button>
                  {searching ? (
                    <ul className="bot-builder-menu-children">
                      {item.blocks.map((block) => (
                        <li key={block.id}>
                          <button
                            type="button"
                            className="bot-builder-menu-child"
                            onClick={() => placeBlock(block)}
                          >
                            {block.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : isExp && showSubmenus ? (
                    <ul className="bot-builder-submenu">
                      {subGroups.map((group) => (
                        <li key={group}>
                          <button
                            type="button"
                            className={cn(
                              "bot-builder-submenu-item",
                              openGroup?.cat === item.id && openGroup.group === group && "is-on",
                            )}
                            onClick={() => {
                              setOpenGroup({ cat: item.id, group });
                              setFlyoutLearnOpen(false);
                              setNotice(group);
                            }}
                          >
                            {group}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {!searching && isExp && !showSubmenus ? (
                    <ul className="bot-builder-menu-children">
                      {item.blocks.map((block) => (
                        <li key={block.id}>
                          <button
                            type="button"
                            className="bot-builder-menu-child"
                            onClick={() => placeBlock(block)}
                          >
                            {block.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
            </ul>
          ) : null}

          {openGroup ? (
            <div className="bot-builder-flyout">
              <div className="bot-builder-flyout-head">
                <span>{openGroup.group}</span>
                <button
                  type="button"
                  className="bot-builder-flyout-close"
                  onClick={() => {
                    setOpenGroup(null);
                    setFlyoutLearnOpen(false);
                  }}
                >
                  Close
                </button>
              </div>
              {BOT_BUILDER_FLYOUT_HELP[openGroup.group] ? (
                <div className="bot-builder-flyout-help">
                  <p>{BOT_BUILDER_FLYOUT_HELP[openGroup.group]}</p>
                  <button
                    type="button"
                    className="bot-builder-flyout-learn"
                    onClick={() => setFlyoutLearnOpen((open) => !open)}
                  >
                    Learn more
                  </button>
                  {flyoutLearnOpen ? (
                    <div className="bot-builder-flyout-learn-body">
                      {(BOT_BUILDER_FLYOUT_LEARN[openGroup.group] ?? [
                        BOT_BUILDER_FLYOUT_HELP[openGroup.group]!,
                        "Click a block to add it to the matching hat on the workspace. Analysis blocks feed purchase conditions; utility blocks log, wait, or change values while the bot runs.",
                      ]).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <ul className="bot-builder-flyout-list">
                {flyoutBlocks.map((block) => (
                  <li key={block.id}>
                    <button
                      type="button"
                      className="bot-builder-flyout-block"
                      onClick={() => {
                        placeBlock(block);
                        setOpenGroup(null);
                      }}
                    >
                      <span className="bot-builder-flyout-block-label">{block.label}</span>
                      {block.hint ? (
                        <span className="bot-builder-flyout-block-hint">{block.hint}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <section className="bot-builder-workspace">
          <header className="bot-builder-toolbar" data-testid="dt_dashboard_toolbar">
            <div className="bot-builder-tool-group" data-testid="dt_toolbar_group_btn">
              {TOOLBAR_STRIP.map((item, index) => {
                if (item.kind === "div") {
                  return <span key={`div-${index}`} className="bot-builder-tool-divider" />;
                }
                const Icon = TOOLBAR_ICONS[item.id];
                const disabled =
                  (item.id === "undo" && historyIndex <= 0) ||
                  (item.id === "redo" && historyIndex >= history.length - 1);
                const on =
                  (item.id === "charts" && chartOpen) || (item.id === "tradingview" && tvOpen);
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`db-toolbar__${item.id === "zoom-out" ? "zoom-out" : `${item.id}-button`}`}
                    title={item.label}
                    aria-label={item.label}
                    aria-pressed={on || undefined}
                    disabled={disabled}
                    className={cn("bot-builder-tool", on && "is-on", disabled && "is-disabled")}
                    onClick={() => handleTool(item.id)}
                  >
                    <Icon strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          </header>
          <section className="bot-builder-canvas" data-scroll-pane>
          <div
            className="bot-builder-canvas-grid"
            style={{ transform: `scale(${snapshot.zoom})`, transformOrigin: "top left" }}
          >
            <BuilderBlocklyBlocks
              snapshot={snapshot}
              running={running}
              walletCurrency={walletCurrency}
              tradeFamily={tradeFamily}
              familyTypes={familyTypes}
              purchaseOptions={purchaseOptions}
              durationRule={durationRule}
              durationLimit={durationLimit}
              chips={chips}
              focusBlock={focusBlock}
              vhOpen={vhOpen}
              onFocus={setFocusBlock}
              onPatch={patchSnapshot}
              onToggleVh={() => setVhOpen((open) => !open)}
              onOpenVh={setVhOpen}
            />
          </div>
          <button
            type="button"
            className="bot-builder-trash"
            title="Remove placed blocks"
            aria-label="Remove placed blocks"
            onClick={() => {
              setChips([]);
              setNotice("Placed blocks cleared");
            }}
          >
            <Trash2 strokeWidth={2} />
          </button>
        </section>
        </section>

        <aside className="bot-builder-summary">
          <button
            type="button"
            className="bot-builder-drawer-toggle"
            aria-label={compactLayout ? "Expand run panel" : "Collapse run panel"}
            title={compactLayout ? "Expand" : "Collapse"}
            onClick={() => setCompactLayout((open) => !open)}
          >
            {compactLayout ? "<<" : ">>"}
          </button>
          <div className="bot-builder-run-bar">
            <button
              type="button"
              id="db-animation__run-button"
              className={cn("bot-builder-run", running && "is-stop")}
              data-testid="tc-builder-run"
              aria-label={running ? "Stop bot" : "Run bot"}
              onClick={handleRun}
            >
              {running ? <Square strokeWidth={2} /> : <Play strokeWidth={2} />}
              {running ? "Stop" : "Run"}
            </button>
            <div className="bot-builder-animation">
              <span className="bot-builder-run-state" data-testid="tc-builder-run-state">
                {running ? "Bot is running" : "Bot is not running"}
              </span>
              <span className="bot-builder-status-chip">{snapshot.sourceLabel}</span>
              <span className="bot-builder-wallet" data-testid="tc-builder-wallet" title="Selected wallet">
                {walletLabel}
              </span>
            </div>
          </div>
          <div className="bot-builder-drawer" data-testid="drawer">
          <p className="bot-builder-run-meta">
            {snapshot.market} · {snapshot.tradeType}
            {running ? " · Running" : ""}
          </p>
          <div className="bot-builder-summary-tabs">
            {(["summary", "transactions", "journal"] as const).map((id) => (
              <button
                key={id}
                type="button"
                id={`db-run-panel-tab__${id}`}
                className={cn(
                  "bot-builder-summary-tab",
                  summaryTab === id && "bot-builder-summary-tab-active",
                )}
                onClick={() => setSummaryTab(id)}
              >
                {id === "summary" ? "Summary" : id === "transactions" ? "Transactions" : "Journal"}
              </button>
            ))}
          </div>
          <div className="bot-builder-summary-body" data-scroll-pane>
            {summaryTab === "summary" ? (
              <div className="bot-builder-summary-empty" data-testid="mock-summary">
                <p>
                  When you’re ready to trade, hit <strong>Run</strong>. You’ll be able to track your
                  bot’s performance here.
                </p>
              </div>
            ) : summaryTab === "transactions" ? (
              fills.length ? (
                <ul className="bot-builder-journal">
                  {fills.slice(0, 12).map((fill) => (
                    <li key={fill.contractId}>
                      <span>{new Date(fill.updatedAt).toLocaleTimeString()}</span>
                      <span>
                        {fill.symbol} · {(fill.profit ?? 0) >= 0 ? "+" : ""}
                        {(fill.profit ?? 0).toFixed(2)} {walletCurrency}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bot-builder-summary-empty">
                  <p>There are no transactions to display</p>
                  <p>Here are the possible reasons:</p>
                  <ul>
                    <li>The bot is not running</li>
                    <li>The stats are cleared</li>
                  </ul>
                </div>
              )
            ) : journal.length ? (
              <ul className="bot-builder-journal">
                {journal.map((entry) => (
                  <li key={entry.id}>
                    <span>{new Date(entry.at).toLocaleTimeString()}</span>
                    <span>{entry.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bot-builder-summary-empty">
                <p>There are no messages to display</p>
                <p>Here are the possible reasons:</p>
                <ul>
                  <li>The bot is not running</li>
                  <li>The stats are cleared</li>
                  <li>All messages are filtered out</li>
                </ul>
              </div>
            )}
          </div>
          {summaryTab !== "journal" ? (
            <div className="bot-builder-stats-wrap">
              <button
                type="button"
                className="bot-builder-whats-this"
                onClick={() => setStatsHelpOpen(true)}
              >
                What&apos;s this?
              </button>
              <dl className="bot-builder-summary-stats">
                {stats.map((stat) => (
                  <div key={stat.label} className="bot-builder-summary-stat">
                    <dt>{stat.label}</dt>
                    <dd className="font-mono">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          <button
            type="button"
            id="db-run-panel__clear-button"
            className="bot-builder-reset"
            onClick={() => {
              setJournal([]);
              setNotice("Stats cleared");
            }}
          >
            Reset
          </button>
          </div>
        </aside>
      </div>

      {loadOpen ? (
        <div
          className="tc-modal-scrim tc-load-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tc-builder-load-title"
          onClick={() => setLoadOpen(false)}
        >
          <div className="tc-modal bot-builder-load-modal" onClick={(event) => event.stopPropagation()}>
            <p className="tc-modal-title" id="tc-builder-load-title">
              Load strategy
            </p>
            <div className="bot-builder-load-tabs" role="tablist">
              {(["recent", "local", "drive"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={loadTab === tab}
                  className={cn("bot-builder-load-tab", loadTab === tab && "is-on")}
                  onClick={() => setLoadTab(tab)}
                >
                  {tab === "recent" ? "Recent" : tab === "local" ? "Local" : "Google Drive"}
                </button>
              ))}
            </div>
            {loadTab === "recent" ? (
              <div className="bot-builder-load-empty">
                <p>You do not have any recent bots</p>
                <p>Create one or upload one from your local drive or Google Drive.</p>
                <button
                  type="button"
                  className="bot-builder-flyout-learn"
                  onClick={() => setRecentWhyOpen((open) => !open)}
                >
                  Why can&apos;t I see my recent bots?
                </button>
                {recentWhyOpen ? (
                  <p>
                    If you&apos;ve recently used bots but don&apos;t see them in this list, it may be
                    because you logged in from a different device, a different browser, or cleared
                    your browser cache.
                  </p>
                ) : null}
              </div>
            ) : null}
            {loadTab === "local" ? (
              <div
                className={cn("bot-builder-load-empty bot-builder-dropzone", loadDragging && "is-over")}
                onDragOver={(event) => {
                  event.preventDefault();
                  setLoadDragging(true);
                }}
                onDragLeave={() => setLoadDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setLoadDragging(false);
                  handleFile(event.dataTransfer.files);
                }}
              >
                <p>Importing XML files from Binary Bot and other third-party platforms may take longer.</p>
                <p>Drag your XML file here</p>
                <p>or, if you prefer...</p>
                <label htmlFor="tc-builder-xml-computer" className="bot-builder-btn-primary">
                  Select an XML file from your device
                </label>
              </div>
            ) : null}
            {loadTab === "drive" ? (
              <div className="bot-builder-load-empty">
                <p>To import your bot from your Google Drive, you&apos;ll need to sign in to your Google account.</p>
                <p>
                  To know how Google Drive handles your data, please review Deriv’s Privacy policy.
                </p>
                <button
                  type="button"
                  className="bot-builder-btn-primary"
                  onClick={() => {
                    setLoadOpen(false);
                    setDriveOpen(true);
                  }}
                >
                  Sign in
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="tc-btn tc-btn-ghost"
              onClick={() => setLoadOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {resetOpen ? (
        <div
          className="tc-modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tc-builder-reset-title"
          onClick={() => setResetOpen(false)}
        >
          <div className="tc-modal" onClick={(event) => event.stopPropagation()}>
            <p className="tc-modal-title" id="tc-builder-reset-title">
              Are you sure?
            </p>
            <p className="tc-modal-body">Any unsaved changes will be lost.</p>
            <div className="tc-load-dialog-actions">
              <button type="button" className="tc-btn tc-btn-ghost" onClick={() => setResetOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="bot-builder-btn-primary"
                onClick={() => {
                  setResetOpen(false);
                  resetWorkspace();
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saveOpen ? (
        <div
          className="tc-modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tc-builder-save-title"
          onClick={() => setSaveOpen(false)}
        >
          <div className="tc-modal" onClick={(event) => event.stopPropagation()}>
            <p className="tc-modal-title" id="tc-builder-save-title">
              Save strategy
            </p>
            <p className="tc-modal-body">
              Enter your bot name, choose to save on your computer or Google Drive, and hit Save.
            </p>
            <label className="bot-builder-save-name">
              Bot name
              <input
                value={saveName}
                placeholder="Bot name"
                onChange={(event) => setSaveName(event.target.value)}
              />
            </label>
            <div className="bot-builder-save-targets">
              <button
                type="button"
                className={cn("bot-builder-save-target", saveTarget === "local" && "is-on")}
                onClick={() => setSaveTarget("local")}
              >
                Local
              </button>
              <button
                type="button"
                className={cn("bot-builder-save-target", saveTarget === "drive" && "is-on")}
                onClick={() => setSaveTarget("drive")}
              >
                Google Drive
              </button>
            </div>
            <div className="tc-load-dialog-actions">
              <button type="button" className="tc-btn tc-btn-ghost" onClick={() => setSaveOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="bot-builder-btn-primary"
                onClick={() => {
                  downloadStrategy(saveName.trim() || "Untitled Bot");
                  setSaveOpen(false);
                  if (saveTarget === "drive") {
                    setNotice("XML downloaded — upload it to Google Drive");
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {chartOpen ? (
        <div className="chart-desk-modal" role="dialog" aria-modal="true" onClick={() => setChartOpen(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <header>
              <span>Chart</span>
              <button type="button" onClick={() => setChartOpen(false)}>
                Close
              </button>
            </header>
            <div className="bot-builder-chart-panel">
              <p className="bot-builder-chart-quote">
                {lastQuote != null ? lastQuote.toFixed(2) : "Waiting for ticks"}
              </p>
              <BuilderSparkline ticks={chartTicks} />
            </div>
          </div>
        </div>
      ) : null}

      {tvOpen ? (
        <div className="chart-desk-modal" role="dialog" aria-modal="true" onClick={() => setTvOpen(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <header>
              <span>TradingView Chart</span>
              <button type="button" onClick={() => setTvOpen(false)}>
                Close
              </button>
            </header>
            <iframe
              title="TradingView Chart"
              src={`https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(snapshot.symbol)}&interval=1&hidesidetoolbar=0&theme=light`}
            />
          </div>
        </div>
      ) : null}

      {statsHelpOpen ? (
        <div
          className="tc-modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tc-builder-stats-help-title"
          onClick={() => setStatsHelpOpen(false)}
        >
          <div className="tc-modal" onClick={(event) => event.stopPropagation()}>
            <p className="tc-modal-title" id="tc-builder-stats-help-title">
              What&apos;s this?
            </p>
            <dl className="bot-builder-stats-help">
              {BOT_BUILDER_STATS_HELP.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.body}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className="tc-btn tc-btn-ghost" onClick={() => setStatsHelpOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <DriveFileDialog
        inputId="tc-builder-xml-drive"
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
      />
      <QuickStrategyStudio
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreate={(next) =>
          installBot(next, `${next.sourceLabel} generated on the workspace`)
        }
        onRun={(next) =>
          installBot(next, `${next.sourceLabel} generated on the workspace`, true)
        }
      />

      {tourOpen ? (
        <TourDialog
          title="Let's build a bot"
          body={
            <>
              <p>Learn how to build from a simple strategy, then follow the tutorial.</p>
              <p>Start to focus Trade parameters and walk the four lanes.</p>
            </>
          }
          onSkip={() => {
            window.localStorage.setItem("tc-tour-builder", "1");
            setTourOpen(false);
          }}
          onStart={() => {
            window.localStorage.setItem("tc-tour-builder", "1");
            setTourOpen(false);
            setFocusBlock("trade");
            setActiveCategory("trade-parameters");
          }}
        />
      ) : null}
    </div>
  );
}

function BuilderSparkline({ ticks }: { ticks: TickEvent[] }) {
  if (ticks.length < 2) {
    return <p className="bot-builder-chart-empty">Price ticks appear here once the market is live.</p>;
  }
  const quotes = ticks.map((tick) => tick.quote);
  const min = Math.min(...quotes);
  const max = Math.max(...quotes);
  const span = max - min || 1;
  const d = quotes
    .map((quote, index) => {
      const x = (index / (quotes.length - 1)) * 100;
      const y = 36 - ((quote - min) / span) * 32;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg className="bot-builder-sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke="#064e72" strokeWidth="1.4" />
    </svg>
  );
}
