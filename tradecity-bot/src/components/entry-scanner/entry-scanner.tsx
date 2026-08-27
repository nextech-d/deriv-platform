import { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { ULTIMATE_BOT_MARKETS } from '@/constants/ultimate-markets';
import { api_base } from '@/external/bot-skeleton';
import { useAnalysisTicks } from '@/hooks/useAnalysisTicks';
import { useBulkTrading } from '@/hooks/useBulkTrading';
import { useStore } from '@/hooks/useStore';
import {
    barriersForMode,
    clampEntryLimit,
    clampEntryMartingale,
    clampEntryStake,
    clampScanDepth,
    digitsFromPrices,
    ENTRY_SCAN_DEPTH,
    ENTRY_SCAN_PARAMS_DEFAULT,
    type EntryScanMode,
    type EntryScanParams,
    type EntryScanResult,
    heroCopy,
    pickBestMarket,
    qualityPct,
    readSavedParams,
    readSavedScan,
    scoreDigits,
    scoreMarket,
    toScanResult,
    writeSavedParams,
    writeSavedScan,
} from '@/utils/entry-scanner';
import { loadAnalysisBiasInBuilder } from '@/utils/load-analysis-bias';
import { ultimateStake } from '@/utils/ultimate-bot';
import './entry-scanner.scss';

const FAB_SIZE = 58;
const FAB_POS_KEY = 'tc-ai-fab-pos';
const SCAN_BATCH = 3;

type ApiSend = {
    send: (request: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function readFabPos(): { left: number; top: number } | null {
    try {
        const raw = window.sessionStorage.getItem(FAB_POS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { left?: number; top?: number };
        if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) return null;
        return clampFabPos(Number(parsed.left), Number(parsed.top));
    } catch {
        return null;
    }
}

function clampFabPos(left: number, top: number): { left: number; top: number } {
    const maxLeft = Math.max(8, window.innerWidth - FAB_SIZE - 8);
    const maxTop = Math.max(8, window.innerHeight - FAB_SIZE - 8);
    return {
        left: Math.min(maxLeft, Math.max(8, left)),
        top: Math.min(maxTop, Math.max(8, top)),
    };
}

async function fetchPrices(symbol: string, count: number): Promise<Array<string | number>> {
    const api = api_base?.api as ApiSend | null;
    if (!api) throw new Error('offline');
    const response = await api.send({
        ticks_history: symbol,
        end: 'latest',
        count,
        style: 'ticks',
    });
    const history = response?.history as { prices?: Array<string | number> } | undefined;
    return Array.isArray(history?.prices) ? history.prices : [];
}

type TEntryScannerProps = {
    onSeededToBuilder: () => void;
};

const EntryScanner = observer(({ onSeededToBuilder }: TEntryScannerProps) => {
    const { app, client } = useStore();
    const currency = client?.currency || 'USD';
    const loggedIn = Boolean(client?.is_logged_in);
    const { buy, settlements, busy, notice } = useBulkTrading(currency);

    const [open, setOpen] = useState(false);
    const [paramsOpen, setParamsOpen] = useState(false);
    const [mode, setMode] = useState<EntryScanMode>('01-08');
    const [depth, setDepth] = useState(ENTRY_SCAN_DEPTH);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [scanLabel, setScanLabel] = useState('');
    const [status, setStatus] = useState('Ready to scan markets');
    const [result, setResult] = useState<EntryScanResult | null>(null);
    const [saved, setSaved] = useState<EntryScanResult | null>(null);
    const [params, setParams] = useState<EntryScanParams>({ ...ENTRY_SCAN_PARAMS_DEFAULT });
    const [running, setRunning] = useState(false);
    const [fabPos, setFabPos] = useState<{ left: number; top: number } | null>(null);
    const [stats, setStats] = useState({ trades: 0, wins: 0, losses: 0, profit: 0, consecutiveLosses: 0 });

    const { quotes } = useAnalysisTicks(result?.symbol ? [result.symbol] : []);

    const drag = useRef({
        active: false,
        moved: false,
        pointer: 0,
        startX: 0,
        startY: 0,
        originLeft: 0,
        originTop: 0,
    });
    const pendingRef = useRef(false);
    const settledSeenRef = useRef(0);
    const runningRef = useRef(false);

    useEffect(() => {
        setFabPos(readFabPos());
        setSaved(readSavedScan());
        setParams(readSavedParams());
    }, []);

    useEffect(() => {
        runningRef.current = running;
    }, [running]);

    useEffect(() => {
        const onResize = () => {
            setFabPos(current => (current ? clampFabPos(current.left, current.top) : current));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const persistFab = useCallback((next: { left: number; top: number }) => {
        const clamped = clampFabPos(next.left, next.top);
        setFabPos(clamped);
        window.sessionStorage.setItem(FAB_POS_KEY, JSON.stringify(clamped));
        return clamped;
    }, []);

    const onFabPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        const node = event.currentTarget;
        const rect = node.getBoundingClientRect();
        drag.current = {
            active: true,
            moved: false,
            pointer: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originLeft: rect.left,
            originTop: rect.top,
        };
        node.setPointerCapture(event.pointerId);
    };

    const onFabPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!drag.current.active || event.pointerId !== drag.current.pointer) return;
        const dx = event.clientX - drag.current.startX;
        const dy = event.clientY - drag.current.startY;
        if (!drag.current.moved && dx * dx + dy * dy < 36) return;
        drag.current.moved = true;
        persistFab({
            left: drag.current.originLeft + dx,
            top: drag.current.originTop + dy,
        });
    };

    const endFabPointer = (event: React.PointerEvent<HTMLButtonElement>, openIfClick: boolean) => {
        if (event.pointerId !== drag.current.pointer) return;
        const wasDrag = drag.current.moved;
        drag.current.active = false;
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            /* already released */
        }
        if (openIfClick && !wasDrag) setOpen(true);
    };

    const applyResult = (next: EntryScanResult) => {
        setResult(next);
        setMode(next.mode);
        writeSavedScan(next);
        setSaved(next);
        setStatus(
            next.recovered
                ? `Recovery confirmed · ${next.label} · ${next.tradeLabel}`
                : `Best market · ${next.label} · ${next.tradeLabel}`
        );
    };

    const closeAll = () => {
        setRunning(false);
        runningRef.current = false;
        pendingRef.current = false;
        setParamsOpen(false);
        setOpen(false);
    };

    const runDeepScan = async () => {
        if (scanning || running) return;
        if (!api_base?.api) {
            setStatus('Wait for the connection, then scan again.');
            return;
        }

        const count = clampScanDepth(depth);
        setDepth(count);
        setScanning(true);
        setProgress(0);
        setScanLabel(ULTIMATE_BOT_MARKETS[0]?.label ?? '');
        setStatus('Scanning markets…');

        const scores: ReturnType<typeof scoreMarket>[] = [];
        for (let index = 0; index < ULTIMATE_BOT_MARKETS.length; index += SCAN_BATCH) {
            const batch = ULTIMATE_BOT_MARKETS.slice(index, index + SCAN_BATCH);
            const part = await Promise.all(
                batch.map(async market => {
                    try {
                        const prices = await fetchPrices(market.id, count);
                        return scoreMarket(market.id, prices, mode);
                    } catch {
                        return scoreMarket(market.id, [], mode);
                    }
                })
            );
            scores.push(...part);
            const done = Math.min(ULTIMATE_BOT_MARKETS.length, index + batch.length);
            setProgress(done);
            setScanLabel(ULTIMATE_BOT_MARKETS[done - 1]?.label ?? '');
        }

        const best = pickBestMarket(scores);
        const next = best ? toScanResult(best, mode) : null;
        if (next) applyResult(next);
        else setStatus('No Over / Under recovery on these markets. Scan again.');
        setScanning(false);
    };

    const loadScan = async () => {
        const stored = result ?? readSavedScan();
        if (!stored) {
            setStatus('No saved scan yet. Run Deep Scan first.');
            return;
        }
        applyResult(stored);
        onSeededToBuilder();
        closeAll();
        try {
            await app.ensureBlocklyWorkspace();
            await loadAnalysisBiasInBuilder({
                symbol: stored.symbol,
                mode: 'barrier',
                side: stored.contractType === 'DIGITOVER' ? 'CALL' : 'PUT',
                barrier: stored.barrier,
                digitTarget: stored.lastDigit ?? stored.barrier,
                label: stored.tradeLabel || stored.label,
            });
        } catch (error) {
            console.warn('[EntryScanner] Failed to seed Bot Builder', error);
        }
    };

    const updateParam = <K extends keyof EntryScanParams>(key: K, value: EntryScanParams[K]) => {
        setParams(current => {
            const next = { ...current, [key]: value };
            writeSavedParams(next);
            return next;
        });
    };

    const nextStake = ultimateStake(
        params.stake,
        stats.consecutiveLosses,
        params.useMartingale,
        params.martingale
    );
    const limitStop =
        (params.takeProfit > 0 && stats.profit >= params.takeProfit) ||
        (params.stopLoss > 0 && stats.profit <= -params.stopLoss);

    const place = useCallback(
        (target: EntryScanResult, amount: number) => {
            pendingRef.current = true;
            buy({
                symbol: target.symbol,
                contractType: target.contractType,
                lastDigitPrediction: target.barrier,
                duration: 1,
                durationUnit: 't',
                amount,
                count: 1,
            });
        },
        [buy]
    );

    const startRun = () => {
        const target = result ?? readSavedScan();
        if (!target) {
            setStatus('No saved scan yet. Run Deep Scan first.');
            return;
        }
        if (!loggedIn) {
            setStatus('Sign in to run the scan.');
            return;
        }
        const next = {
            stake: clampEntryStake(params.stake),
            martingale: clampEntryMartingale(params.martingale),
            takeProfit: clampEntryLimit(params.takeProfit),
            stopLoss: clampEntryLimit(params.stopLoss),
            useMartingale: params.useMartingale,
        };
        setParams(next);
        writeSavedParams(next);
        applyResult(target);
        setStats({ trades: 0, wins: 0, losses: 0, profit: 0, consecutiveLosses: 0 });
        settledSeenRef.current = settlements.length;
        setParamsOpen(false);
        setRunning(true);
        runningRef.current = true;
        setStatus(`Running ${target.label} · ${target.tradeLabel}`);
        place(target, ultimateStake(next.stake, 0, next.useMartingale, next.martingale));
    };

    const stopRun = () => {
        setRunning(false);
        runningRef.current = false;
        pendingRef.current = false;
        setStatus(result ? `Stopped · ${result.label} · ${result.tradeLabel}` : 'Scanner stopped');
    };

    useEffect(() => {
        if (settlements.length <= settledSeenRef.current) return;
        const fresh = settlements.slice(settledSeenRef.current);
        settledSeenRef.current = settlements.length;
        setStats(prev =>
            fresh.reduce(
                (acc, settled) => ({
                    trades: acc.trades + 1,
                    wins: acc.wins + (settled.won ? 1 : 0),
                    losses: acc.losses + (settled.won ? 0 : 1),
                    profit: Number((acc.profit + settled.profit).toFixed(2)),
                    consecutiveLosses: settled.won ? 0 : acc.consecutiveLosses + 1,
                }),
                prev
            )
        );
        pendingRef.current = false;
    }, [settlements]);

    useEffect(() => {
        if (!running || !result || busy || pendingRef.current || !loggedIn) return;
        if (limitStop) {
            setRunning(false);
            runningRef.current = false;
            setStatus(
                params.takeProfit > 0 && stats.profit >= params.takeProfit
                    ? `Take profit hit · ${stats.profit.toFixed(2)} ${currency}`
                    : `Stop loss hit · ${stats.profit.toFixed(2)} ${currency}`
            );
            return;
        }
        const tape = quotes.filter(tick => tick.symbol === result.symbol);
        if (tape.length < 2) return;
        const { over, under } = barriersForMode(result.mode);
        const reading = scoreDigits(
            digitsFromPrices(tape.map(tick => tick.quote)),
            over,
            under
        );
        const last = reading.lastDigit;
        if (last == null) return;
        const stillValid = result.contractType === 'DIGITOVER' ? last > result.barrier : last < result.barrier;
        if (!stillValid) return;
        place(result, nextStake);
    }, [
        quotes,
        running,
        result,
        busy,
        loggedIn,
        limitStop,
        nextStake,
        place,
        params.takeProfit,
        stats.profit,
        currency,
    ]);

    useEffect(() => {
        if (!notice) return;
        pendingRef.current = false;
        setStatus(notice);
    }, [notice]);

    const marketText = result?.label ?? 'Scan to find the best market';
    const quality = result ? qualityPct(result.score) : null;
    const progressPct = Math.round((progress / ULTIMATE_BOT_MARKETS.length) * 100);
    const progressName = scanning ? scanLabel || 'Scanning…' : result?.label || 'Waiting for scan';

    return (
        <>
            <button
                type='button'
                className={classNames('entry-scanner-fab', { 'is-open': open, 'is-placed': Boolean(fabPos) })}
                style={fabPos ? { left: fabPos.left, top: fabPos.top } : undefined}
                aria-label='Open entry scanner'
                aria-haspopup='dialog'
                aria-expanded={open}
                onPointerDown={onFabPointerDown}
                onPointerMove={onFabPointerMove}
                onPointerUp={event => endFabPointer(event, true)}
                onPointerCancel={event => endFabPointer(event, false)}
            >
                <span className='entry-scanner-fab__orbit' aria-hidden='true'>
                    <span />
                    <span />
                    <span />
                </span>
                <span className='entry-scanner-fab__live' aria-hidden='true' />
                AI
            </button>

            {open ? (
                <div
                    className='entry-scanner-scrim'
                    role='presentation'
                    onClick={() => {
                        if (paramsOpen) {
                            setParamsOpen(false);
                            return;
                        }
                        if (!running) closeAll();
                    }}
                >
                    <div
                        className='entry-scanner'
                        role='dialog'
                        aria-modal='true'
                        aria-labelledby='entry-scanner-title'
                        onClick={event => event.stopPropagation()}
                    >
                        <header className='entry-scanner__bar'>
                            <h2 id='entry-scanner-title'>Entry Scanner</h2>
                            <button type='button' aria-label='Close' onClick={closeAll}>
                                ×
                            </button>
                        </header>

                        <div className='entry-scanner__hero'>
                            <div>
                                <span className='entry-scanner__tag'>RECOVERY ENGINE</span>
                                <h3>Digits Scan</h3>
                                <p>{heroCopy(mode)}</p>
                            </div>
                            <span className='entry-scanner__radar' aria-hidden='true' />
                        </div>

                        <div className='entry-scanner__body'>
                            <div className='entry-scanner__modes' role='tablist' aria-label='Scan pair'>
                                <button
                                    type='button'
                                    role='tab'
                                    aria-selected={mode === '01-08'}
                                    className={classNames({ selected: mode === '01-08' })}
                                    disabled={scanning || running}
                                    onClick={() => {
                                        setMode('01-08');
                                        setResult(current => (current?.mode === '01-08' ? current : null));
                                    }}
                                >
                                    OV 1 / UN 8
                                </button>
                                <button
                                    type='button'
                                    role='tab'
                                    aria-selected={mode === '02-07'}
                                    className={classNames({ selected: mode === '02-07' })}
                                    disabled={scanning || running}
                                    onClick={() => {
                                        setMode('02-07');
                                        setResult(current => (current?.mode === '02-07' ? current : null));
                                    }}
                                >
                                    OV 2 / UN 7
                                </button>
                            </div>

                            <div className='entry-scanner__fields'>
                                <label className='entry-scanner__field'>
                                    <span>SCAN DEPTH</span>
                                    <input
                                        type='number'
                                        min={100}
                                        max={5000}
                                        step={100}
                                        value={depth}
                                        disabled={scanning || running}
                                        onChange={event => setDepth(clampScanDepth(Number(event.target.value)))}
                                    />
                                </label>
                                <div className='entry-scanner__field'>
                                    <span>SELECTED MARKET</span>
                                    <strong>{marketText}</strong>
                                </div>
                            </div>

                            <div className='entry-scanner__meter' aria-live='polite'>
                                <div>
                                    <span>{progressName}</span>
                                    <em>
                                        {scanning ? progress : result ? ULTIMATE_BOT_MARKETS.length : 0}/
                                        {ULTIMATE_BOT_MARKETS.length}
                                    </em>
                                </div>
                                <div className='entry-scanner__bar-track'>
                                    <i style={{ width: `${scanning ? progressPct : result ? 100 : 0}%` }} />
                                </div>
                            </div>

                            {result ? (
                                <label className='entry-scanner__best'>
                                    <input type='radio' checked readOnly />
                                    <span>
                                        Best market: {result.label} · {quality?.toFixed(2)}% · Entry{' '}
                                        {result.lastDigit ?? '—'} · {result.recovered ? 'Quality' : 'Watch'}
                                    </span>
                                </label>
                            ) : (
                                <p className='entry-scanner__status'>
                                    <span aria-hidden='true' />
                                    {status}
                                </p>
                            )}

                            {result ? (
                                <p className='entry-scanner__status'>
                                    <span aria-hidden='true' />
                                    {running
                                        ? `${status} · P/L ${stats.profit.toFixed(2)} · stake ${nextStake}`
                                        : status}
                                </p>
                            ) : null}
                        </div>

                        <div className='entry-scanner__actions'>
                            <button
                                type='button'
                                className='entry-scanner__btn entry-scanner__btn--solid'
                                disabled={scanning || running}
                                onClick={() => void runDeepScan()}
                            >
                                {scanning ? 'Scanning…' : 'Deep Scan Markets'}
                            </button>
                            {running ? (
                                <button
                                    type='button'
                                    className='entry-scanner__btn entry-scanner__btn--ghost'
                                    onClick={stopRun}
                                >
                                    Stop
                                </button>
                            ) : (
                                <button
                                    type='button'
                                    className='entry-scanner__btn entry-scanner__btn--ghost'
                                    disabled={scanning || (!saved && !result)}
                                    onClick={() => void loadScan()}
                                >
                                    Load Scan
                                </button>
                            )}
                        </div>
                    </div>

                    {paramsOpen ? (
                        <div
                            className='entry-scanner-params'
                            role='dialog'
                            aria-modal='true'
                            aria-labelledby='entry-scanner-params-title'
                            onClick={event => event.stopPropagation()}
                        >
                            <h3 id='entry-scanner-params-title'>Scanner Parameters</h3>
                            <p>Tune the bot before it runs.</p>

                            <label className='entry-scanner-params__field'>
                                <span>STAKE</span>
                                <input
                                    type='number'
                                    min={0.35}
                                    step={0.01}
                                    value={params.stake}
                                    onChange={event =>
                                        updateParam('stake', clampEntryStake(Number(event.target.value)))
                                    }
                                />
                            </label>
                            <label className='entry-scanner-params__field'>
                                <span>MARTINGALE</span>
                                <input
                                    type='number'
                                    min={1}
                                    max={5}
                                    step={0.1}
                                    value={params.martingale}
                                    disabled={!params.useMartingale}
                                    onChange={event =>
                                        updateParam('martingale', clampEntryMartingale(Number(event.target.value)))
                                    }
                                />
                            </label>
                            <label className='entry-scanner-params__field'>
                                <span>TAKE PROFIT ($)</span>
                                <input
                                    type='number'
                                    min={0}
                                    step={0.01}
                                    value={params.takeProfit}
                                    onChange={event =>
                                        updateParam('takeProfit', clampEntryLimit(Number(event.target.value)))
                                    }
                                />
                            </label>
                            <label className='entry-scanner-params__field'>
                                <span>STOP LOSS ($)</span>
                                <input
                                    type='number'
                                    min={0}
                                    step={0.01}
                                    value={params.stopLoss}
                                    onChange={event =>
                                        updateParam('stopLoss', clampEntryLimit(Number(event.target.value)))
                                    }
                                />
                            </label>

                            <div className='entry-scanner-params__toggle'>
                                <span>USE MARTINGALE</span>
                                <button
                                    type='button'
                                    role='switch'
                                    aria-checked={params.useMartingale}
                                    className={classNames({ on: params.useMartingale })}
                                    onClick={() => updateParam('useMartingale', !params.useMartingale)}
                                >
                                    <i />
                                </button>
                            </div>

                            <div className='entry-scanner-params__actions'>
                                <button
                                    type='button'
                                    className='entry-scanner__btn entry-scanner__btn--ghost'
                                    onClick={() => setParamsOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type='button'
                                    className='entry-scanner__btn entry-scanner__btn--solid'
                                    disabled={busy}
                                    onClick={startRun}
                                >
                                    Load and Run
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </>
    );
});

export default EntryScanner;
