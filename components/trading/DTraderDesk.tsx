"use client";

import { ChartDesk } from "@/components/trading/ChartDesk";
import { DTraderTicket, type DTraderFamily } from "@/components/trading/DTraderTicket";
import type { ChartHistorySnapshot, TickEvent } from "@/lib/ws/protocol";

interface DTraderDeskProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  lastQuote: number | null;
  tickHistory: TickEvent[];
  isConnected: boolean;
  isTrading: boolean;
  demoMode: boolean;
  stake: number;
  duration: number;
  tradeNotice: string | null;
  tradingLocked: boolean;
  dTraderFamily: DTraderFamily;
  dTraderBarrier: number;
  dTraderDigitTarget?: number;
  onStakeChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onTrade: (payload: {
    contractType: string;
    barrier?: number | string;
    barrier2?: number | string;
    lastDigitPrediction?: number;
    durationUnit?: string;
    duration?: number;
  }) => void;
  formatLocal: (value: number) => string;
  chartHistory?: ChartHistorySnapshot | null;
  chartHistoryLoading?: boolean;
  onRequestHistory?: (symbol: string, granularity: number) => void;
}

export function DTraderDesk(props: DTraderDeskProps) {
  return (
    <div data-testid="d-trader-desk" data-desk className="d-trader">
      <div className="d-trader-chart">
        <ChartDesk
          symbol={props.symbol}
          onSymbolChange={props.onSymbolChange}
          lastQuote={props.lastQuote}
          tickHistory={props.tickHistory}
          isConnected={props.isConnected}
          onSubscribe={props.onSymbolChange}
          chartHistory={props.chartHistory}
          chartHistoryLoading={props.chartHistoryLoading}
          onRequestHistory={props.onRequestHistory}
          embedded
        />
      </div>
      <aside className="d-trader-side" data-scroll-pane>
        <DTraderTicket
          symbol={props.symbol}
          isConnected={props.isConnected}
          isTrading={props.isTrading}
          demoMode={props.demoMode}
          stake={props.stake}
          duration={props.duration}
          tradeNotice={props.tradeNotice}
          hasLiveQuote={props.lastQuote != null}
          tradingLocked={props.tradingLocked}
          initialFamily={props.dTraderFamily}
          initialBarrier={props.dTraderBarrier}
          initialDigitTarget={props.dTraderDigitTarget}
          onStakeChange={props.onStakeChange}
          onDurationChange={props.onDurationChange}
          onTrade={props.onTrade}
          formatLocal={props.formatLocal}
          embedded
        />
      </aside>
    </div>
  );
}
