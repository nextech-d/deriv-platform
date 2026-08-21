import type { FreeBotStrategy } from '@/constants/free-bots';

export type BuilderTradeType = 'Rise/Fall' | 'Even/Odd' | 'Over/Under' | 'Matches';

export interface FreeBotSeed {
    symbol: string;
    tradetype: string;
    contractType: string;
    purchaseLabel: string;
    duration: string;
    durationUnit: string;
    stake: string;
    lastDigitPrediction: number;
    quickStrategyKey: 'MARTINGALE' | 'REVERSE_MARTINGALE';
    sourceLabel: string;
}

const TRADE_TYPE_MAP: Record<BuilderTradeType, string> = {
    'Rise/Fall': 'callput',
    'Even/Odd': 'evenodd',
    'Over/Under': 'overunder',
    Matches: 'matchesdiffers',
};

const CONTRACT_TYPE_MAP: Record<string, Record<string, string>> = {
    callput: { Rise: 'CALL', Fall: 'PUT' },
    evenodd: { Even: 'DIGITEVEN', Odd: 'DIGITODD' },
    overunder: { Over: 'DIGITOVER', Under: 'DIGITUNDER' },
    matchesdiffers: { Matches: 'DIGITMATCH', Differs: 'DIGITDIFF' },
};

function inferTradeType(strategy: FreeBotStrategy): {
    tradeType: BuilderTradeType;
    purchase: string;
    barrier: number;
    digitTarget: number;
} {
    const blob = `${strategy.name} ${strategy.tags.join(' ')}`.toLowerCase();
    let tradeType: BuilderTradeType = 'Rise/Fall';
    let purchase = 'Rise';
    let barrier = 4;
    let digitTarget = 5;

    if (blob.includes('even') || blob.includes('odd') || blob.includes('parity')) {
        tradeType = 'Even/Odd';
        purchase = blob.includes('odd') && !blob.includes('even') ? 'Odd' : 'Even';
    } else if (blob.includes('under') || blob.includes('over') || blob.includes('barrier')) {
        tradeType = 'Over/Under';
        purchase = blob.includes('under') ? 'Under' : 'Over';
        barrier = blob.includes('8') ? 8 : blob.includes('7') ? 7 : blob.includes('1') ? 1 : 4;
    } else if (blob.includes('match')) {
        tradeType = 'Matches';
        purchase = 'Matches';
        digitTarget = 5;
    } else if (blob.includes('rise') || blob.includes('fall') || blob.includes('candle')) {
        tradeType = 'Rise/Fall';
        purchase = 'Rise';
    } else {
        tradeType = 'Even/Odd';
        purchase = 'Even';
    }

    return { tradeType, purchase, barrier, digitTarget };
}

function pickQuickStrategy(strategy: FreeBotStrategy): 'MARTINGALE' | 'REVERSE_MARTINGALE' {
    const blob = `${strategy.name} ${strategy.tags.join(' ')}`.toLowerCase();
    if (blob.includes('recovery') || blob.includes('reverse')) {
        return 'REVERSE_MARTINGALE';
    }
    return 'MARTINGALE';
}

/** Heuristic seed from catalog metadata — same rules as legacy freeBotToSnapshot. */
export function freeBotToSeed(strategy: FreeBotStrategy): FreeBotSeed {
    const symbol = strategy.markets[0] ?? 'R_100';
    const { tradeType, purchase, barrier, digitTarget } = inferTradeType(strategy);
    const tradetype = TRADE_TYPE_MAP[tradeType];
    const contractType = CONTRACT_TYPE_MAP[tradetype]?.[purchase] ?? 'CALL';
    const lastDigitPrediction = tradeType === 'Matches' ? digitTarget : barrier;

    return {
        symbol,
        tradetype,
        contractType,
        purchaseLabel: purchase,
        duration: '1',
        durationUnit: 't',
        stake: strategy.difficulty === 'advanced' ? '1.00' : '0.60',
        lastDigitPrediction,
        quickStrategyKey: pickQuickStrategy(strategy),
        sourceLabel: `Free bots · ${strategy.name}`,
    };
}
