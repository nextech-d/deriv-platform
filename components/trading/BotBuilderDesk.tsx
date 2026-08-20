"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickChart,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  LayoutGrid,
  LineChart,
  Play,
  Redo2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  BOT_BUILDER_TOOLBOX,
  type BuilderBlockDef,
  type BuilderCategoryId,
} from "@/lib/terminal/bot-builder";
import {
  DEFAULT_BUILDER_SNAPSHOT,
  builderMarketOptions,
  builderGroupedMarketOptions,
  snapshotFromXml,
  snapshotToBotConfig,
  snapshotToXml,
  symbolFromMarketLabel,
  BUILDER_TRADE_TYPES,
  CANDLE_INTERVALS,
  DURATION_RULES,
  DURATION_UNIT_LABELS,
  clampSnapshotDuration,
  defaultQuickParams,
  durationBounds,
  normalizeLoadedSnapshot,
  normalizePurchase,
  purchasesForTradeType,
  type BotBuilderSnapshot,
  type BuilderTradeType,
  type DurationUnit,
} from "@/lib/terminal/strategy-seed";
import { TourDialog } from "@/components/trading/TourDialog";
import { consumeBuilderHandoff } from "@/lib/terminal/desk-handoff";
import type { BotConfig, QuickStrategyType } from "@/lib/bot/types";
import { QUICK_STRATEGY_METAS } from "@/lib/bot/types";
import { cn } from "@/lib/utils/cn";

type SummaryTab = "summary" | "transactions" | "journal";
type FocusBlock = "trade" | "purchase" | "sell" | "restart";

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
  runStats?: {
    totalStake: number;
    totalPayout: number;
    runs: number;
    lost: number;
    won: number;
    pnl: number;
  };
  recentJournal?: string[];
}

const TOOLBAR_ICONS = {
  refresh: RefreshCw,
  open: FolderOpen,
  save: Save,
  layout: LayoutGrid,
  line: LineChart,
  candle: CandlestickChart,
  undo: Undo2,
  redo: Redo2,
  "zoom-out": ZoomOut,
  "zoom-in": ZoomIn,
} as const;

const TOOL_GROUPS = [
  {
    id: "file",
    items: [
      ["refresh", "Reset workspace"],
      ["open", "Load XML"],
      ["save", "Save strategy"],
    ],
  },
  {
    id: "view",
    items: [
      ["layout", "Block layout"],
      ["line", "Line chart"],
      ["candle", "Candlestick chart"],
    ],
  },
  {
    id: "history",
    items: [
      ["undo", "Undo"],
      ["redo", "Redo"],
    ],
  },
  {
    id: "zoom",
    items: [
      ["zoom-out", "Zoom out"],
      ["zoom-in", "Zoom in"],
    ],
  },
] as const;

function BlockHead({ index, title }: { index: string; title: string }) {
  return (
    <header className="bot-builder-block-head">
      <span className="bot-builder-block-index">{index}</span>
      <h3>{title}</h3>
    </header>
  );
}

function LaneChips({ chips, lane }: { chips: CanvasChip[]; lane: FocusBlock }) {
  const shown = chips.filter((chip) => chip.lane === lane).slice(0, 10);
  if (!shown.length) return null;
  return (
    <div className="bot-builder-chips">
      {shown.map((chip) => (
        <span key={chip.id} className="bot-builder-chip">
          {chip.label}
        </span>
      ))}
    </div>
  );
}

const ALL_TRADE_TYPES = Object.keys(BUILDER_TRADE_TYPES) as BuilderTradeType[];

export function BotBuilderDesk({
  seed = null,
  seedKey = 0,
  onOpenAiBot,
  onRun,
  runStats,
  recentJournal = [],
}: BotBuilderDeskProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<BuilderCategoryId>("trade-parameters");
  const [summaryTab, setSummaryTab] = useState<SummaryTab>("summary");
  const [focusBlock, setFocusBlock] = useState<FocusBlock>("trade");
  const [snapshot, setSnapshot] = useState<BotBuilderSnapshot>(DEFAULT_BUILDER_SNAPSHOT);
  const [history, setHistory] = useState<BotBuilderSnapshot[]>([DEFAULT_BUILDER_SNAPSHOT]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [chips, setChips] = useState<CanvasChip[]>([]);
  const [compactLayout, setCompactLayout] = useState(false);
  const [notice, setNotice] = useState("Pick a category, then click a block in the flyout");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [openGroup, setOpenGroup] = useState<{ cat: string; group: string } | null>(null);
  const [vhOpen, setVhOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

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
    const next = seed ?? handed;
    if (!next) return;
    applySnapshot(next, `Loaded · ${next.sourceLabel}`);
    setNotice(`Loaded · ${next.sourceLabel}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

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

  function applySnapshot(next: BotBuilderSnapshot, journalText?: string) {
    const normalized = normalizeLoadedSnapshot(next);
    setSnapshot(normalized);
    pushHistory(normalized);
    if (journalText) {
      setJournal((prev) =>
        [{ id: crypto.randomUUID(), at: Date.now(), text: journalText }, ...prev].slice(
          0,
          40,
        ),
      );
    }
  }

  function patchSnapshot(partial: Partial<BotBuilderSnapshot>, journalText?: string) {
    const next: BotBuilderSnapshot = {
      ...snapshot,
      ...partial,
      symbol:
        partial.market != null
          ? symbolFromMarketLabel(partial.market)
          : (partial.symbol ?? snapshot.symbol),
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
    const categoryLabel = activeCat?.label ?? "Blocks";

    const chipLane: FocusBlock =
      block.action === "focus-purchase"
        ? "purchase"
        : block.action === "focus-sell"
          ? "sell"
          : block.action === "focus-restart"
            ? "restart"
            : block.action === "focus-trade" ||
                block.action === "set-even-odd" ||
                block.action === "set-over-under" ||
                block.action === "set-matches" ||
                block.action === "set-rise-fall"
              ? "trade"
              : block.action.startsWith("add-")
                ? "purchase"
                : focusBlock;

    setChips((prev) =>
      [
        {
          id: `${block.id}-${Date.now()}`,
          label: block.label,
          category: categoryLabel,
          lane: chipLane,
        },
        ...prev,
      ].slice(0, 24),
    );

    switch (block.action) {
      case "focus-trade":
        setFocusBlock("trade");
        setNotice(`Opened · ${block.label}`);
        break;
      case "focus-purchase":
        setFocusBlock("purchase");
        setNotice(`Opened · ${block.label}`);
        break;
      case "focus-sell":
        setFocusBlock("sell");
        if (block.id !== "during-purchase") {
          patchSnapshot({ sellAction: "sell_at_market" }, `Block · ${block.label}`);
          setNotice(`Sell condition · ${block.label}`);
        } else {
          setNotice(`Opened · ${block.label}`);
        }
        break;
      case "focus-restart":
        setFocusBlock("restart");
        patchSnapshot(
          { restartAction: block.id === "stop-after-loss" ? "stop" : "trade_again" },
          `Block · ${block.label}`,
        );
        setNotice(`Restart · ${block.label}`);
        break;
      case "set-even-odd":
        setFocusBlock("trade");
        patchSnapshot(
          { tradeType: "Even/Odd", purchase: "Even", botStrategy: "parity_bias" },
          `Block · ${block.label}`,
        );
        setNotice(`Lane set · Even/Odd`);
        break;
      case "set-over-under":
        setFocusBlock("trade");
        patchSnapshot(
          { tradeType: "Over/Under", purchase: "Over", botStrategy: "barrier_edge" },
          `Block · ${block.label}`,
        );
        setNotice(`Lane set · Over/Under`);
        break;
      case "set-matches":
        setFocusBlock("trade");
        patchSnapshot(
          { tradeType: "Matches", purchase: "Matches", botStrategy: "digit_match" },
          `Block · ${block.label}`,
        );
        setNotice(`Lane set · Matches`);
        break;
      case "set-rise-fall":
        setFocusBlock("trade");
        patchSnapshot(
          { tradeType: "Rise/Fall", purchase: "Rise", botStrategy: "ma_cross" },
          `Block · ${block.label}`,
        );
        setNotice(`Lane set · Rise/Fall`);
        break;
      case "add-tick": {
        // In DBot these would be connected to placeholders; in our simplified builder we
        // map the most important indicator blocks to actual `BotConfig` parameters.
        if (block.id.startsWith("ind-")) {
          if (block.id === "ind-rsi" || block.id === "ind-rsia") {
            patchSnapshot(
              {
                botStrategy: "rsi_threshold",
                rsiPeriod: 14,
                rsiOversold: 30,
                rsiOverbought: 70,
              },
              `Indicator · ${block.label}`,
            );
            setNotice(`Indicator · RSI (14)`);
            break;
          }

          const maPeriods: { fast: number; slow: number } =
            block.id === "ind-macda" ? { fast: 12, slow: 26 } : { fast: 5, slow: 20 };

          patchSnapshot(
            {
              botStrategy: "ma_cross",
              fastPeriod: maPeriods.fast,
              slowPeriod: maPeriods.slow,
            },
            `Indicator · ${block.label}`,
          );
          setNotice(`Indicator · MA cross (${maPeriods.fast}/${maPeriods.slow})`);
          break;
        }

        // Tick/candle "sources" are not represented by our simplified bot runner yet.
        log(`Added tick source · ${block.label}`);
        setNotice(`Tick source · ${block.label}`);
        break;
      }
      case "add-logic": {
        // Minimal functional mapping for sell-related logic.
        if (block.id === "contract-check-sell") {
          setFocusBlock("sell");
          patchSnapshot({ sellAction: "sell_at_market" }, `Block · ${block.label}`);
          setNotice(`Sell is available · ${block.label}`);
          break;
        }

        log(`Added logic · ${block.label}`);
        setNotice(`Logic · ${block.label}`);
        break;
      }
      case "add-loop": {
        // Map "wait" blocks to our bot cooldown gate.
        if (block.id === "time-timeout") {
          patchSnapshot({ cooldownTicks: 10 }, `Block · ${block.label}`);
          setNotice(`Cooldown set · ${block.label}`);
          break;
        }
        if (block.id === "time-tickdelay") {
          patchSnapshot({ cooldownTicks: 3 }, `Block · ${block.label}`);
          setNotice(`Cooldown set · ${block.label}`);
          break;
        }

        log(`Added loop · ${block.label}`);
        setNotice(`Loop · ${block.label}`);
        break;
      }
      case "add-math":
        log(`Added math · ${block.label}`);
        setNotice(`Math · ${block.label}`);
        break;
      case "add-notify":
        log(`Added notify · ${block.label}`);
        setNotice(`Notify · ${block.label}`);
        break;
      case "add-variable":
        log(`Added variable · ${block.label}`);
        setNotice(`Variable · ${block.label}`);
        break;
      case "noop":
        if (block.id === "virtual-hook-switcher") {
          patchSnapshot(
            {
              virtualHook: !snapshot.virtualHook,
              quickStrategy: snapshot.virtualHook
                ? undefined
                : (snapshot.quickStrategy ?? defaultQuickParams("martingale")),
            },
            `Block · ${block.label}`,
          );
          setNotice(snapshot.virtualHook ? "Virtual hook off" : "Virtual hook on");
          break;
        }
        if (block.id === "barrier-settings") {
          setFocusBlock("trade");
          setNotice("Set barrier in Trade parameters");
          break;
        }
        if (block.id === "contract-modifiers") {
          setFocusBlock("trade");
          setNotice("Adjust contract type in Trade parameters");
          break;
        }
        log(`Added · ${categoryLabel} › ${block.label}`);
        setNotice(`Added · ${block.label}`);
        break;
      default:
        log(`Added · ${categoryLabel} › ${block.label}`);
        setNotice(`Added · ${block.label}`);
        break;
    }
    setSummaryTab("journal");
  }

  function handleTool(id: keyof typeof TOOLBAR_ICONS) {
    if (id === "refresh") {
      applySnapshot(DEFAULT_BUILDER_SNAPSHOT, "Workspace reset");
      setChips([]);
      setFocusBlock("trade");
      setNotice("Workspace reset");
      return;
    }
    if (id === "open") {
      fileRef.current?.click();
      return;
    }
    if (id === "save") {
      const xml = snapshotToXml(snapshot);
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `tradecity-strategy-${Date.now()}.xml`;
      anchor.click();
      URL.revokeObjectURL(url);
      log("Strategy saved as XML");
      setNotice("Strategy downloaded");
      return;
    }
    if (id === "layout") {
      setCompactLayout((v) => !v);
      setNotice(compactLayout ? "Expanded layout" : "Compact layout");
      return;
    }
    if (id === "line") {
      patchSnapshot({ chartMode: "line" }, "Chart mode · line");
      setNotice("Chart mode · line");
      return;
    }
    if (id === "candle") {
      patchSnapshot({ chartMode: "candle" }, "Chart mode · candle");
      setNotice("Chart mode · candle");
      return;
    }
    if (id === "undo" && historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setSnapshot(history[nextIndex]!);
      setNotice("Undo");
      return;
    }
    if (id === "redo" && historyIndex < history.length - 1) {
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
        return;
      }
      applySnapshot(
        { ...parsed, sourceLabel: `Loaded · ${file.name}` },
        `Imported ${file.name}`,
      );
      setNotice(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleRun() {
    onRun?.(snapshotToBotConfig(snapshot), snapshot);
    log(`Run → Trading bot · ${snapshot.tradeType} · ${snapshot.symbol}`);
    setSummaryTab("journal");
    setNotice("Sent to Trading bot runner");
  }

  const purchaseOptions = purchasesForTradeType(snapshot.tradeType);
  const stats = [
    { label: "Total stake", value: `${(runStats?.totalStake ?? 0).toFixed(2)} AUD` },
    { label: "Total payout", value: `${(runStats?.totalPayout ?? 0).toFixed(2)} AUD` },
    { label: "No. of runs", value: String(runStats?.runs ?? 0) },
    { label: "Contracts lost", value: String(runStats?.lost ?? 0) },
    { label: "Contracts won", value: String(runStats?.won ?? 0) },
    { label: "Total profit/loss", value: `${(runStats?.pnl ?? 0).toFixed(2)} AUD` },
  ];
  const marketGroups = builderGroupedMarketOptions();
  const activeMarketGroup =
    marketGroups.find((group) => group.options.some((option) => option.label === snapshot.market)) ??
    marketGroups[0];
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
  const vhMeta =
    QUICK_STRATEGY_METAS.find(
      (meta) => meta.type === (snapshot.quickStrategy?.type ?? "martingale"),
    ) ?? QUICK_STRATEGY_METAS[0];
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
        ref={fileRef}
        type="file"
        accept=".xml,application/xml,text/xml,application/json"
        className="tc-file-input"
        tabIndex={-1}
        onChange={(event) => handleFile(event.target.files)}
      />

      <header className="bot-builder-toolbar">
        <div className="bot-builder-toolbar-tools">
          {TOOL_GROUPS.map((group) => (
            <div key={group.id} className={cn("bot-builder-tool-group", `is-${group.id}`)}>
              {group.items.map(([id, label]) => {
                const Icon = TOOLBAR_ICONS[id];
                const on =
                  (id === "line" && snapshot.chartMode === "line") ||
                  (id === "candle" && snapshot.chartMode === "candle") ||
                  (id === "layout" && compactLayout);
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    aria-label={label}
                    className={cn("bot-builder-tool", on && "is-on")}
                    onClick={() => handleTool(id)}
                  >
                    <Icon strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="bot-builder-toolbar-status">
          <p className="bot-builder-notice">{notice}</p>
          <span className="bot-builder-status-chip">{snapshot.sourceLabel}</span>
          <span className="bot-builder-status-chip is-zoom">{snapshot.zoom.toFixed(2)}×</span>
        </div>
      </header>

      <div className="bot-builder-shell">
        <aside className="bot-builder-menu">
          <div className="bot-builder-menu-head">
            {onOpenAiBot ? (
              <button type="button" className="bot-builder-ai-btn" onClick={onOpenAiBot}>
                <Sparkles strokeWidth={2} />
                AI Bot Generator
              </button>
            ) : null}
            <p className="bot-builder-menu-title">Blocks menu</p>
            <label className="bot-builder-search">
              <Search strokeWidth={2} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search blocks"
              />
            </label>
          </div>

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
                      } else if (item.id === "trade-parameters") {
                        setFocusBlock("trade");
                      } else if (item.id === "purchase-conditions") {
                        setFocusBlock("purchase");
                      } else if (item.id === "sell-conditions") {
                        setFocusBlock("sell");
                      } else if (item.id === "restart-conditions") {
                        setFocusBlock("restart");
                      } else {
                        setOpenGroup({ cat: item.id, group: item.label });
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

          {openGroup ? (
            <div className="bot-builder-flyout">
              <div className="bot-builder-flyout-head">
                <span>{openGroup.group}</span>
                <button
                  type="button"
                  className="bot-builder-flyout-close"
                  onClick={() => setOpenGroup(null)}
                >
                  Close
                </button>
              </div>
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

        <section className="bot-builder-canvas" data-scroll-pane>
          <div
            className="bot-builder-canvas-grid"
            style={{ transform: `scale(${snapshot.zoom})`, transformOrigin: "top left" }}
          >
            <article
              data-lane="trade"
              className={cn("bot-builder-block", focusBlock === "trade" && "bot-builder-block-focused")}
              onClick={() => setFocusBlock("trade")}
            >
              <BlockHead index="1" title="Trade parameters" />
              <div className="bot-builder-block-body">
                <div className="bot-builder-inline">
                  <span className="bot-builder-inline-label">Market</span>
                  <select
                    className="bot-builder-inline-select"
                    value={activeMarketGroup?.group ?? ""}
                    onChange={(event) => {
                      const group = marketGroups.find((item) => item.group === event.target.value);
                      if (group?.options[0]) {
                        patchSnapshot({ market: group.options[0].label }, "Market group changed");
                      }
                    }}
                  >
                    {marketGroups.map((group) => (
                      <option key={group.group} value={group.group}>
                        {group.group}
                      </option>
                    ))}
                  </select>
                  <select
                    className="bot-builder-inline-select"
                    value={snapshot.market}
                    onChange={(event) => patchSnapshot({ market: event.target.value }, "Market updated")}
                  >
                    {(activeMarketGroup?.options ?? builderMarketOptions()).map((option) => (
                      <option key={option.symbol} value={option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bot-builder-inline">
                  <span className="bot-builder-inline-label">Trade type</span>
                  <select
                    className="bot-builder-inline-select"
                    value={tradeFamily}
                    onChange={(event) => {
                      const family = event.target.value;
                      if (family === "Up/Down") patchSnapshot({ tradeType: "Rise/Fall" });
                      else if (family === "Digits") patchSnapshot({ tradeType: "Even/Odd" });
                      else if (family === "In/Out") patchSnapshot({ tradeType: "Touch/No Touch" });
                      else if (family === "Asian") patchSnapshot({ tradeType: "Asian" });
                      else if (family === "Reset") patchSnapshot({ tradeType: "Reset" });
                      else if (family === "High/Low Ticks") patchSnapshot({ tradeType: "High/Low Ticks" });
                    }}
                  >
                    <option value="Up/Down">Up/Down</option>
                    <option value="Digits">Digits</option>
                    <option value="In/Out">In/Out</option>
                    <option value="Asian">Asian</option>
                    <option value="Reset">Reset</option>
                    <option value="High/Low Ticks">High/Low Ticks</option>
                  </select>
                  <select
                    className="bot-builder-inline-select"
                    value={snapshot.tradeType}
                    onChange={(event) =>
                      patchSnapshot({ tradeType: event.target.value as BuilderTradeType })
                    }
                  >
                    {familyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bot-builder-inline">
                  <span className="bot-builder-inline-label">Contract type</span>
                  <select
                    className="bot-builder-inline-select"
                    value={snapshot.contractType}
                    onChange={(event) =>
                      patchSnapshot({
                        contractType: event.target.value as BotBuilderSnapshot["contractType"],
                      })
                    }
                  >
                    <option>Both</option>
                    <option>Call</option>
                    <option>Put</option>
                  </select>
                  <span className="bot-builder-inline-sep">Default candle interval</span>
                  <select
                    className="bot-builder-inline-select"
                    value={snapshot.candleInterval}
                    onChange={(event) =>
                      patchSnapshot({
                        candleInterval: event.target.value as BotBuilderSnapshot["candleInterval"],
                      })
                    }
                  >
                    {CANDLE_INTERVALS.map((interval) => (
                      <option key={interval} value={interval}>
                        {interval}
                      </option>
                    ))}
                  </select>
                </div>
                {BUILDER_TRADE_TYPES[snapshot.tradeType]?.needsBarrier ? (
                  <div className="bot-builder-inline">
                    <span className="bot-builder-inline-label">Barrier</span>
                    <input
                      className="bot-builder-inline-input"
                      type="number"
                      step={0.01}
                      value={snapshot.barrier}
                      onChange={(event) =>
                        patchSnapshot({ barrier: Number(event.target.value) || 0 })
                      }
                    />
                  </div>
                ) : null}
                {BUILDER_TRADE_TYPES[snapshot.tradeType]?.needsDigit ? (
                  <div className="bot-builder-inline">
                    <span className="bot-builder-inline-label">
                      {snapshot.tradeType === "Matches" ? "Match digit" : "Digit barrier"}
                    </span>
                    <input
                      className="bot-builder-inline-input"
                      type="number"
                      min={0}
                      max={9}
                      value={snapshot.tradeType === "Matches" ? snapshot.digitTarget : snapshot.barrier}
                      onChange={(event) => {
                        const value = Math.min(9, Math.max(0, Number(event.target.value) || 0));
                        patchSnapshot(
                          snapshot.tradeType === "Matches" ? { digitTarget: value } : { barrier: value },
                        );
                      }}
                    />
                  </div>
                ) : null}
                <div className="bot-builder-checks">
                  <label className="bot-builder-check">
                    <input
                      type="checkbox"
                      checked={snapshot.alternateMarkets}
                      onChange={(event) =>
                        patchSnapshot({
                          alternateMarkets: event.target.checked,
                          maxOpenPositions: event.target.checked
                            ? Math.max(2, snapshot.maxOpenPositions)
                            : 1,
                        })
                      }
                    />
                    Alternate markets
                  </label>
                  <label className="bot-builder-check">
                    <input
                      type="checkbox"
                      checked={snapshot.virtualHook}
                      onChange={(event) => patchSnapshot({ virtualHook: event.target.checked })}
                    />
                    Virtual hook
                  </label>
                  {snapshot.virtualHook ? (
                    <button
                      type="button"
                      className="bot-builder-vh-link"
                      onClick={() => setVhOpen((open) => !open)}
                    >
                      VH Settings
                    </button>
                  ) : null}
                  <label className="bot-builder-check">
                    <input
                      type="checkbox"
                      checked={snapshot.restartOnError}
                      onChange={(event) => patchSnapshot({ restartOnError: event.target.checked })}
                    />
                    Restart last trade on error
                  </label>
                </div>
                {snapshot.virtualHook && vhOpen ? (
                  <div
                    className="bot-builder-vh-panel"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="bot-builder-inline">
                      <span className="bot-builder-inline-label">Recovery</span>
                      <select
                        className="bot-builder-inline-select"
                        value={snapshot.quickStrategy?.type ?? "martingale"}
                        onChange={(event) =>
                          patchSnapshot({
                            virtualHook: true,
                            quickStrategy: defaultQuickParams(
                              event.target.value as QuickStrategyType,
                            ),
                          })
                        }
                      >
                        {QUICK_STRATEGY_METAS.map((meta) => (
                          <option key={meta.type} value={meta.type}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {vhMeta?.fields
                      .filter((field) => field.key !== "type" && !field.hidden)
                      .map((field) => (
                        <div key={field.key} className="bot-builder-inline">
                          <span className="bot-builder-inline-label">{field.label}</span>
                          <input
                            className="bot-builder-inline-input"
                            type="number"
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={Number(
                              snapshot.quickStrategy?.[field.key] ?? field.defaultValue,
                            )}
                            onChange={(event) =>
                              patchSnapshot({
                                virtualHook: true,
                                quickStrategy: {
                                  ...(snapshot.quickStrategy ??
                                    defaultQuickParams("martingale")),
                                  [field.key]: Number(event.target.value),
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                  </div>
                ) : null}
                <div className="bot-builder-nested">
                  <p className="bot-builder-nested-title">Trade options</p>
                  <div className="bot-builder-inline">
                    <span className="bot-builder-inline-label">Duration</span>
                    <select
                      className="bot-builder-inline-select"
                      value={snapshot.durationUnit}
                      onChange={(event) =>
                        patchSnapshot({ durationUnit: event.target.value as DurationUnit })
                      }
                    >
                      {durationRule?.units.map((unit) => (
                        <option key={unit} value={unit}>
                          {DURATION_UNIT_LABELS[unit]}
                        </option>
                      ))}
                    </select>
                    <input
                      className="bot-builder-inline-input"
                      type="number"
                      min={durationLimit.min}
                      max={durationLimit.max}
                      value={snapshot.duration}
                      onChange={(event) => patchSnapshot({ duration: event.target.value })}
                    />
                    <span className="bot-builder-inline-sep">Stake</span>
                    <input
                      className="bot-builder-inline-input"
                      type="number"
                      min={0.35}
                      step={0.01}
                      value={snapshot.stake}
                      onChange={(event) => patchSnapshot({ stake: event.target.value })}
                    />
                  </div>
                </div>
                <LaneChips chips={chips} lane="trade" />
              </div>
            </article>

            <article
              data-lane="purchase"
              className={cn(
                "bot-builder-block",
                focusBlock === "purchase" && "bot-builder-block-focused",
              )}
              onClick={() => setFocusBlock("purchase")}
            >
              <BlockHead index="2" title="Purchase conditions" />
              <div className="bot-builder-block-body">
                <div className="bot-builder-inline">
                  <span className="bot-builder-inline-label">Purchase</span>
                  <select
                    className="bot-builder-inline-select"
                    value={snapshot.purchase}
                    onChange={(event) => patchSnapshot({ purchase: event.target.value })}
                  >
                    {purchaseOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <LaneChips chips={chips} lane="purchase" />
              </div>
            </article>

            <article
              data-lane="sell"
              className={cn("bot-builder-block", focusBlock === "sell" && "bot-builder-block-focused")}
              onClick={() => setFocusBlock("sell")}
            >
              <BlockHead index="3" title="Sell conditions" />
              <div className="bot-builder-block-body">
                <p className="bot-builder-logic-line">
                  <span className="bot-builder-logic-chip">If</span>
                  Sell is available
                  <span className="bot-builder-logic-chip">Then</span>
                </p>
                <div className="bot-builder-inline">
                  <span className="bot-builder-inline-label">Action</span>
                  <select
                    className="bot-builder-inline-select"
                    value={snapshot.sellAction}
                    onChange={(event) =>
                      patchSnapshot({
                        sellAction: event.target.value as BotBuilderSnapshot["sellAction"],
                      })
                    }
                  >
                    <option value="none">No action</option>
                    <option value="sell_at_market">Sell at market</option>
                  </select>
                </div>
                <LaneChips chips={chips} lane="sell" />
              </div>
            </article>

            <article
              data-lane="restart"
              className={cn(
                "bot-builder-block",
                focusBlock === "restart" && "bot-builder-block-focused",
              )}
              onClick={() => setFocusBlock("restart")}
            >
              <BlockHead index="4" title="Restart trading conditions" />
              <div className="bot-builder-block-body">
                <div className="bot-builder-inline">
                  <span className="bot-builder-inline-label">After contract</span>
                  <select
                    className="bot-builder-inline-select"
                    value={snapshot.restartAction}
                    onChange={(event) =>
                      patchSnapshot({
                        restartAction: event.target.value as BotBuilderSnapshot["restartAction"],
                      })
                    }
                  >
                    <option value="trade_again">Trade again</option>
                    <option value="stop">Stop after loss</option>
                  </select>
                </div>
                <LaneChips chips={chips} lane="restart" />
              </div>
            </article>
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

        <aside className="bot-builder-summary">
          <div className="bot-builder-run-bar">
            <button type="button" className="bot-builder-run" onClick={handleRun}>
              <Play strokeWidth={2} />
              Run
            </button>
            <label className="bot-builder-fast">
              <span>Fast</span>
              <button
                type="button"
                role="switch"
                aria-checked={snapshot.fastExecution}
                className={cn("bot-builder-switch", snapshot.fastExecution && "is-on")}
                onClick={() =>
                  patchSnapshot(
                    { fastExecution: !snapshot.fastExecution },
                    snapshot.fastExecution ? "Fast off" : "Fast on",
                  )
                }
              >
                <span />
              </button>
            </label>
          </div>
          <p className="bot-builder-run-meta">
            {snapshot.market} · {snapshot.tradeType}
          </p>
          <div className="bot-builder-summary-tabs">
            {(["summary", "transactions", "journal"] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "bot-builder-summary-tab",
                  summaryTab === id && "bot-builder-summary-tab-active",
                )}
                onClick={() => setSummaryTab(id)}
              >
                {id === "transactions" ? "Fills" : id}
              </button>
            ))}
          </div>
          <div className="bot-builder-summary-body" data-scroll-pane>
            {summaryTab === "summary" ? (
              <dl className="bot-builder-recap">
                <div>
                  <dt>Market</dt>
                  <dd>{snapshot.market}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{snapshot.tradeType}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>
                    {snapshot.duration} {DURATION_UNIT_LABELS[snapshot.durationUnit]}
                  </dd>
                </div>
                <div>
                  <dt>Stake</dt>
                  <dd>{snapshot.stake}</dd>
                </div>
                <div>
                  <dt>Purchase</dt>
                  <dd>{snapshot.purchase}</dd>
                </div>
                <div>
                  <dt>Contract</dt>
                  <dd>{snapshot.contractType}</dd>
                </div>
                <div>
                  <dt>Fast</dt>
                  <dd>{snapshot.fastExecution ? "On" : "Off"}</dd>
                </div>
              </dl>
            ) : summaryTab === "transactions" ? (
              <p className="bot-builder-summary-empty">
                {runStats && runStats.runs > 0
                  ? `${runStats.runs} runs · ${runStats.won} won · ${runStats.lost} lost`
                  : "Fills appear here after the bot places trades."}
              </p>
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
              <p className="bot-builder-summary-empty">Placements and events stream here.</p>
            )}
          </div>
          <dl className="bot-builder-summary-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="bot-builder-summary-stat">
                <dt>{stat.label}</dt>
                <dd className="font-mono">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            className="bot-builder-reset"
            onClick={() => {
              setJournal([]);
              setNotice("Journal cleared");
            }}
          >
            Clear journal
          </button>
        </aside>
      </div>

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
