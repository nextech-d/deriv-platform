import type { ActiveSymbol } from '@deriv-com/smartcharts-champion';

/** Synthetic indices shown when Deriv active_symbols is not ready yet. */
export const FALLBACK_CHART_SYMBOLS: ActiveSymbol[] = [
    {
        display_name: 'Volatility 10 Index',
        market: 'synthetic_index',
        market_display_name: 'Derived',
        subgroup: 'random_index',
        subgroup_display_name: 'Continuous Indices',
        submarket: 'random_index',
        submarket_display_name: 'Continuous Indices',
        symbol: 'R_10',
        symbol_type: 'synthetic_index',
        pip: 0.001,
        exchange_is_open: 1,
        is_trading_suspended: 0,
        delay_amount: 0,
    },
    {
        display_name: 'Volatility 100 Index',
        market: 'synthetic_index',
        market_display_name: 'Derived',
        subgroup: 'random_index',
        subgroup_display_name: 'Continuous Indices',
        submarket: 'random_index',
        submarket_display_name: 'Continuous Indices',
        symbol: 'R_100',
        symbol_type: 'synthetic_index',
        pip: 0.001,
        exchange_is_open: 1,
        is_trading_suspended: 0,
        delay_amount: 0,
    },
    {
        display_name: 'Volatility 100 (1s) Index',
        market: 'synthetic_index',
        market_display_name: 'Derived',
        subgroup: 'random_index',
        subgroup_display_name: 'Continuous Indices',
        submarket: 'random_index',
        submarket_display_name: 'Continuous Indices',
        symbol: '1HZ100V',
        symbol_type: 'synthetic_index',
        pip: 0.001,
        exchange_is_open: 1,
        is_trading_suspended: 0,
        delay_amount: 0,
    },
];

export const DEFAULT_CHART_SYMBOL = 'R_10';
