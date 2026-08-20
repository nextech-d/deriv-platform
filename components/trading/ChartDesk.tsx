"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Activity,
  AreaChart,
  CandlestickChart,
  ChevronDown,
  ChevronRight,
  Download,
  LayoutTemplate,
  LineChart,
  Pencil,
  Star,
} from "lucide-react";
import {
  CHART_MARKET_TREE,
  chartMarketLabel,
  flattenChartMarkets,
  isOtcMarket,
} from "@/lib/terminal/chart-markets";
import {
  DERIV_CHART_TIMEFRAMES,
  candlesFromDeriv,
  formatChartTime,
  ticksToTimeCandles,
  type Candle,
  type DerivGranularity,
} from "@/lib/chart/candles";
import type { ChartHistorySnapshot, TickEvent } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils/cn";

interface ChartDeskProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  lastQuote: number | null;
  tickHistory: TickEvent[];
  isConnected: boolean;
  onSubscribe: (symbol: string) => void;
  onOpenManual?: () => void;
  onOpenAnalysis?: () => void;
  onOpenDTrader?: () => void;
  embedded?: boolean;
  chartHistory?: ChartHistorySnapshot | null;
  chartHistoryLoading?: boolean;
  onRequestHistory?: (symbol: string, granularity: number) => void;
}

const TOOLS = ["Chart types", "Indicators", "Templates", "Drawing tools", "Download"] as const;
type ChartType = "area" | "line" | "candle";

const VW = 1000;
const VH = 420;
const PAD = { l: 16, r: 88, t: 22, b: 28 };
const FAV_KEY = "tc-chart-favorites";

function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function ChartDesk({
  symbol,
  onSymbolChange,
  lastQuote,
  tickHistory,
  isConnected,
  onSubscribe,
  onOpenAnalysis,
  onOpenDTrader,
  embedded = false,
  chartHistory = null,
  chartHistoryLoading = false,
  onRequestHistory,
}: ChartDeskProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState<"markets" | "favorites">("markets");
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    synthetics: true,
    baskets: true,
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    continuous: true,
  });
  const [showPrice, setShowPrice] = useState(true);
  const [chartType, setChartType] = useState<ChartType>("area");
  const [granularity, setGranularity] = useState<DerivGranularity>(0);
  const [showMa, setShowMa] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [guides, setGuides] = useState<number[]>([]);
  const [tvOpen, setTvOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favReady, setFavReady] = useState(false);
  const plotRef = useRef<HTMLDivElement>(null);
  const fillId = `tc-chart-fill-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    setFavorites(readFavorites());
    setFavReady(true);
  }, []);

  useEffect(() => {
    if (!favReady) return;
    window.localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }, [favorites, favReady]);

  const ticks = useMemo(() => {
    const live =
      chartHistory && chartHistory.symbol === symbol && chartHistory.granularity === 0
        ? chartHistory.ticks
        : [];
    if (live.length >= 2) return live;
    if (onRequestHistory && (chartHistoryLoading || !isConnected)) return [];
    return tickHistory.filter((t) => !t.symbol || t.symbol === symbol);
  }, [
    chartHistory,
    chartHistoryLoading,
    isConnected,
    onRequestHistory,
    symbol,
    tickHistory,
  ]);

  const candles = useMemo((): Candle[] => {
    if (granularity <= 0) return [];
    if (
      chartHistory &&
      chartHistory.symbol === symbol &&
      chartHistory.granularity === granularity &&
      chartHistory.candles.length
    ) {
      return candlesFromDeriv(chartHistory.candles);
    }
    if (onRequestHistory && (chartHistoryLoading || !isConnected)) return [];
    return ticksToTimeCandles(ticks, granularity);
  }, [
    chartHistory,
    chartHistoryLoading,
    granularity,
    isConnected,
    onRequestHistory,
    symbol,
    ticks,
  ]);

  useEffect(() => {
    if (!onRequestHistory || !isConnected) return;
    onRequestHistory(symbol, granularity);
  }, [symbol, granularity, onRequestHistory, isConnected]);

  useEffect(() => {
    setChartType(granularity === 0 ? "area" : "candle");
  }, [granularity]);

  const quotes =
    chartType === "candle" ? candles.flatMap((c) => [c.high, c.low]) : ticks.map((t) => t.quote);
  const lastClose = candles.at(-1)?.close ?? null;
  const price = lastQuote ?? ticks.at(-1)?.quote ?? lastClose;
  const rawMin = quotes.length ? Math.min(...quotes, price ?? Infinity) : 0;
  const rawMax = quotes.length ? Math.max(...quotes, price ?? -Infinity) : 1;
  const padY = (rawMax - rawMin || 1) * 0.14;
  const minQ = rawMin - padY;
  const maxQ = rawMax + padY;
  const rangeQ = maxQ - minQ || 1;

  const plotW = VW - PAD.l - PAD.r;
  const plotH = VH - PAD.t - PAD.b;

  function xAt(index: number, count: number): number {
    if (count <= 1) return PAD.l;
    return PAD.l + (index / (count - 1)) * plotW;
  }

  function yAt(value: number): number {
    return PAD.t + (1 - (value - minQ) / rangeQ) * plotH;
  }

  const lineSeries =
    granularity > 0 && candles.length ? candles.map((c) => c.close) : ticks.map((t) => t.quote);

  const linePath = useMemo(() => {
    if (lineSeries.length < 2) return "";
    return lineSeries
      .map((value, i) => {
        const cmd = i === 0 ? "M" : "L";
        return `${cmd}${xAt(i, lineSeries.length).toFixed(2)},${yAt(value).toFixed(2)}`;
      })
      .join(" ");
  }, [lineSeries, minQ, rangeQ]);

  const areaPath = linePath
    ? `${linePath} L${xAt(lineSeries.length - 1, lineSeries.length).toFixed(2)},${(PAD.t + plotH).toFixed(2)} L${PAD.l},${(PAD.t + plotH).toFixed(2)} Z`
    : "";

  const maPath = useMemo(() => {
    if (!showMa || lineSeries.length < 8) return "";
    const period = 8;
    return lineSeries
      .map((_, i) => {
        if (i < period - 1) return null;
        const slice = lineSeries.slice(i - period + 1, i + 1);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        const cmd = i === period - 1 ? "M" : "L";
        return `${cmd}${xAt(i, lineSeries.length).toFixed(2)},${yAt(avg).toFixed(2)}`;
      })
      .filter(Boolean)
      .join(" ");
  }, [lineSeries, showMa, minQ, rangeQ]);

  const gridLevels = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.t + (1 - t) * plotH,
    value: minQ + rangeQ * t,
  }));

  function handleTool(tool: (typeof TOOLS)[number]) {
    if (tool === "Chart types") {
      setChartType((t) => (t === "area" ? "line" : t === "line" ? "candle" : "area"));
    } else if (tool === "Indicators") {
      setShowMa((v) => !v);
    } else if (tool === "Templates") {
      setGranularity(0);
      setChartType("area");
      setShowMa(false);
      setGuides([]);
      setDrawMode(false);
    } else if (tool === "Drawing tools") {
      setDrawMode((v) => !v);
    } else if (tool === "Download") {
      const svg = plotRef.current?.querySelector("svg");
      if (!svg) return;
      const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${symbol}-chart.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  function pickMarket(id: string) {
    onSymbolChange(id);
    onSubscribe(id);
    setPickerOpen(false);
  }

  const q = query.trim().toLowerCase();
  const ChartTypeIcon =
    chartType === "candle" ? CandlestickChart : chartType === "line" ? LineChart : AreaChart;
  const candleW = Math.max(4, (plotW / Math.max(candles.length, 1)) * 0.55);
  const firstQuote = lineSeries[0];
  const tfLabel = DERIV_CHART_TIMEFRAMES.find((item) => item.id === granularity)?.label ?? "Ticks";
  const ready = chartType === "candle" ? candles.length >= 2 : lineSeries.length >= 2;
  const delta =
    price != null && firstQuote != null && firstQuote !== 0
      ? ((price - firstQuote) / firstQuote) * 100
      : null;
  const starred = favorites.includes(symbol);
  const favoriteMarkets = flattenChartMarkets().filter((market) => favorites.includes(market.id));

  function toggleFavorite(id: string) {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <div
      data-testid="chart-desk"
      data-desk
      className={cn("chart-desk", !embedded && "is-standalone")}
    >
      {pickerOpen ? (
        <aside className="chart-desk-picker" data-scroll-pane>
          <div className="chart-desk-picker-tabs">
            {(["markets", "favorites"] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={cn("chart-desk-picker-tab", tab === id && "is-on")}
                onClick={() => setTab(id)}
              >
                {id === "markets" ? "Markets" : "Favorites"}
              </button>
            ))}
          </div>
          <label className="chart-desk-search">
            <input
              type="text"
              placeholder="Search markets"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search markets"
            />
          </label>
          {tab === "favorites" ? (
            favoriteMarkets.filter((m) => !q || m.label.toLowerCase().includes(q)).length === 0 ? (
              <p className="chart-desk-empty">Star a market to pin it here.</p>
            ) : (
              favoriteMarkets
                .filter((m) => !q || m.label.toLowerCase().includes(q))
                .map((m) => (
                  <MarketRow
                    key={m.id}
                    id={m.id}
                    label={m.label}
                    selected={m.id === symbol}
                    starred
                    closed={isOtcMarket(m.id)}
                    onPick={pickMarket}
                    onStar={toggleFavorite}
                  />
                ))
            )
          ) : (
            CHART_MARKET_TREE.map((cat) => {
              const catOpen = openCats[cat.id] ?? false;
              return (
                <div key={cat.id}>
                  <button
                    type="button"
                    className="chart-desk-tree-cat"
                    onClick={() => setOpenCats((s) => ({ ...s, [cat.id]: !catOpen }))}
                  >
                    {catOpen ? <ChevronDown strokeWidth={1.75} /> : <ChevronRight strokeWidth={1.75} />}
                    {cat.label}
                  </button>
                  {catOpen
                    ? cat.groups.map((group) => {
                        const groupOpen = openGroups[group.id] ?? false;
                        const markets = q
                          ? group.markets.filter((m) => m.label.toLowerCase().includes(q))
                          : group.markets;
                        if (q && markets.length === 0) return null;
                        return (
                          <div key={group.id}>
                            <button
                              type="button"
                              className="chart-desk-tree-group"
                              onClick={() =>
                                setOpenGroups((s) => ({ ...s, [group.id]: !groupOpen }))
                              }
                            >
                              {groupOpen || q ? (
                                <ChevronDown strokeWidth={1.75} />
                              ) : (
                                <ChevronRight strokeWidth={1.75} />
                              )}
                              {group.label}
                            </button>
                            {groupOpen || q
                              ? markets.map((m) => (
                                  <MarketRow
                                    key={m.id}
                                    id={m.id}
                                    label={m.label}
                                    selected={m.id === symbol}
                                    starred={favorites.includes(m.id)}
                                    closed={isOtcMarket(m.id)}
                                    onPick={pickMarket}
                                    onStar={toggleFavorite}
                                  />
                                ))
                              : null}
                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })
          )}
        </aside>
      ) : null}

      <div className="chart-desk-main">
        <header className="chart-desk-bar">
          {!embedded ? <h1>Charts</h1> : null}
          <button
            type="button"
            className="chart-desk-market"
            onClick={() => setPickerOpen((open) => !open)}
          >
            <span>{chartMarketLabel(symbol)}</span>
            <ChevronDown strokeWidth={1.75} />
          </button>
          <label className="chart-desk-tf">
            <span>TF</span>
            <select
              value={granularity}
              aria-label="Deriv chart timeframe"
              onChange={(event) => setGranularity(Number(event.target.value) as DerivGranularity)}
            >
              {DERIV_CHART_TIMEFRAMES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <span
            className={cn(
              "chart-desk-quote",
              delta != null && delta >= 0 && "is-up",
              delta != null && delta < 0 && "is-down",
            )}
          >
            <strong>{price == null ? "—" : price.toFixed(3)}</strong>
            {delta != null ? (
              <em>
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(2)}%
              </em>
            ) : null}
          </span>
          <span className={cn("chart-desk-chip", (isConnected || ready) && "is-live")}>
            {chartHistoryLoading
              ? "Loading"
              : isConnected
                ? `Deriv · ${tfLabel}`
                : ready
                  ? `Feed · ${tfLabel}`
                  : "Waiting"}
          </span>
          <button
            type="button"
            className={cn("chart-desk-star", starred && "is-on")}
            aria-label={starred ? "Remove from favorites" : "Add to favorites"}
            onClick={() => toggleFavorite(symbol)}
          >
            <Star strokeWidth={1.75} fill={starred ? "currentColor" : "none"} />
          </button>
          <label className="chart-desk-check">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(event) => setShowPrice(event.target.checked)}
            />
            Price on chart
          </label>
          <button type="button" className="chart-desk-tv" onClick={() => setTvOpen(true)}>
            Trading View
          </button>
        </header>

        <div className="chart-desk-body">
          <div className="chart-desk-rail">
            {TOOLS.map((tool) => {
              const active =
                (tool === "Indicators" && showMa) ||
                (tool === "Drawing tools" && drawMode);
              return (
                <button
                  key={tool}
                  type="button"
                  title={
                    tool === "Chart types"
                      ? `Chart types (${chartType})`
                      : tool
                  }
                  aria-label={tool}
                  className={cn("chart-desk-tool", active && "is-on")}
                  onClick={() => handleTool(tool)}
                >
                  {tool === "Chart types" ? (
                    <ChartTypeIcon strokeWidth={1.75} />
                  ) : tool === "Indicators" ? (
                    <Activity strokeWidth={1.75} />
                  ) : tool === "Templates" ? (
                    <LayoutTemplate strokeWidth={1.75} />
                  ) : tool === "Drawing tools" ? (
                    <Pencil strokeWidth={1.75} />
                  ) : (
                    <Download strokeWidth={1.75} />
                  )}
                </button>
              );
            })}
          </div>

          <div
            ref={plotRef}
            className={cn("chart-desk-plot", drawMode && "is-draw")}
            onClick={(event) => {
              if (!drawMode || !plotRef.current) return;
              const rect = plotRef.current.getBoundingClientRect();
              const svgY = ((event.clientY - rect.top) / rect.height) * VH;
              const value = minQ + (1 - (svgY - PAD.t) / plotH) * rangeQ;
              setGuides((g) => [...g.slice(-4), value]);
            }}
          >
            {!ready ? (
              <p className="chart-desk-wait">
                {chartHistoryLoading ? "Loading Deriv history…" : "Waiting for Deriv ticks…"}
              </p>
            ) : (
              <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" className="chart-desk-svg">
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {gridLevels.map((level) => (
                  <line
                    key={level.y}
                    x1={PAD.l}
                    x2={VW - PAD.r}
                    y1={level.y}
                    y2={level.y}
                    className="chart-desk-grid"
                  />
                ))}
                {chartType === "candle"
                  ? candles.map((c, i) => {
                      const x = xAt(i, candles.length);
                      const up = c.close >= c.open;
                      const top = yAt(Math.max(c.open, c.close));
                      const bot = yAt(Math.min(c.open, c.close));
                      return (
                        <g key={i}>
                          <line
                            x1={x}
                            x2={x}
                            y1={yAt(c.high)}
                            y2={yAt(c.low)}
                            className={up ? "chart-desk-wick is-up" : "chart-desk-wick is-down"}
                          />
                          <rect
                            x={x - candleW / 2}
                            y={top}
                            width={candleW}
                            height={Math.max(1.2, bot - top)}
                            className={up ? "chart-desk-candle is-up" : "chart-desk-candle is-down"}
                          />
                        </g>
                      );
                    })
                  : (
                    <>
                      {chartType === "area" ? (
                        <path d={areaPath} fill={`url(#${fillId})`} />
                      ) : null}
                      <path d={linePath} className="chart-desk-line" />
                    </>
                  )}
                {showMa && maPath ? <path d={maPath} className="chart-desk-ma" /> : null}
                {guides.map((g, i) => (
                  <line
                    key={i}
                    x1={PAD.l}
                    x2={VW - PAD.r}
                    y1={yAt(g)}
                    y2={yAt(g)}
                    className="chart-desk-guide"
                  />
                ))}
                {showPrice && price != null ? (
                  <>
                    <line
                      x1={PAD.l}
                      x2={VW - PAD.r}
                      y1={yAt(price)}
                      y2={yAt(price)}
                      className="chart-desk-last"
                    />
                    {lineSeries.length ? (
                      <circle
                        cx={xAt(lineSeries.length - 1, lineSeries.length)}
                        cy={yAt(lineSeries[lineSeries.length - 1]!)}
                        r="4.5"
                        className="chart-desk-dot"
                      />
                    ) : null}
                  </>
                ) : null}
              </svg>
            )}
            {ready
              ? gridLevels.map((level) => (
                  <span
                    key={level.y}
                    className="chart-desk-axis"
                    style={{ top: `${((level.y / VH) * 100).toFixed(2)}%` }}
                  >
                    {level.value.toFixed(3)}
                  </span>
                ))
              : null}
            {ready
              ? (chartType === "candle" ? candles : ticks).map((item, index, all) => {
                  const step = Math.max(1, Math.floor((all.length - 1) / 4));
                  if (index % step !== 0 && index !== all.length - 1) return null;
                  const epoch = "startEpoch" in item ? item.startEpoch : item.epoch;
                  return (
                    <span
                      key={`t-${index}`}
                      className="chart-desk-time"
                      style={{ left: `${((xAt(index, all.length) / VW) * 100).toFixed(2)}%` }}
                    >
                      {formatChartTime(epoch, granularity)}
                    </span>
                  );
                })
              : null}
            {showPrice && price != null && ready ? (
              <span
                className="chart-desk-price"
                style={{ top: `${((yAt(price) / VH) * 100).toFixed(2)}%` }}
              >
                {price.toFixed(3)}
              </span>
            ) : null}
          </div>
        </div>
        {!embedded && (onOpenDTrader || onOpenAnalysis) ? (
          <footer className="chart-desk-handoff">
            {onOpenDTrader ? (
              <button type="button" className="edging-cta is-ink" onClick={onOpenDTrader}>
                Open in D-Trader
              </button>
            ) : null}
            {onOpenAnalysis ? (
              <button type="button" className="edging-cta is-ghost" onClick={onOpenAnalysis}>
                Open Analysis
              </button>
            ) : null}
          </footer>
        ) : null}
      </div>

      {tvOpen ? (
        <div role="dialog" className="chart-desk-modal" onClick={() => setTvOpen(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <header>
              <span>Trading View · {chartMarketLabel(symbol)}</span>
              <button type="button" onClick={() => setTvOpen(false)}>
                Close
              </button>
            </header>
            <iframe
              title="Trading View"
              src={`https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=1&hidesidetoolbar=0&theme=light`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MarketRow({
  id,
  label,
  selected,
  starred,
  closed,
  onPick,
  onStar,
}: {
  id: string;
  label: string;
  selected: boolean;
  starred: boolean;
  closed: boolean;
  onPick: (id: string) => void;
  onStar: (id: string) => void;
}) {
  return (
    <div className={cn("chart-desk-tree-row", selected && "is-on")}>
      <button type="button" className="chart-desk-tree-item" onClick={() => onPick(id)}>
        <span>{label}</span>
        {closed ? <span className="chart-desk-closed">Closed</span> : null}
      </button>
      <button
        type="button"
        className={cn("chart-desk-star", starred && "is-on")}
        aria-label={starred ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
        onClick={() => onStar(id)}
      >
        <Star strokeWidth={1.75} fill={starred ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
