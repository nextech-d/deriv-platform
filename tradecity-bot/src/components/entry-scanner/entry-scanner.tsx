import { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { api_base } from '@/external/bot-skeleton';
import { ULTIMATE_BOT_MARKETS } from '@/constants/ultimate-markets';
import {
    ENTRY_SCAN_DEPTH,
    type EntryScanMode,
    type EntryScanResult,
    heroCopy,
    pickBestMarket,
    readSavedScan,
    scoreMarket,
    toScanResult,
    writeSavedScan,
} from '@/utils/entry-scanner';
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

const EntryScanner = () => {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<EntryScanMode>('01-08');
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Ready to scan markets');
    const [result, setResult] = useState<EntryScanResult | null>(null);
    const [saved, setSaved] = useState<EntryScanResult | null>(null);
    const [fabPos, setFabPos] = useState<{ left: number; top: number } | null>(null);

    const drag = useRef({
        active: false,
        moved: false,
        pointer: 0,
        startX: 0,
        startY: 0,
        originLeft: 0,
        originTop: 0,
    });

    useEffect(() => {
        setFabPos(readFabPos());
        setSaved(readSavedScan());
    }, []);

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

    const runDeepScan = async () => {
        if (scanning) return;
        if (!api_base?.api) {
            setStatus('Wait for the connection, then scan again.');
            return;
        }

        setScanning(true);
        setProgress(0);
        setStatus('Scanning markets…');

        const scores: ReturnType<typeof scoreMarket>[] = [];
        for (let index = 0; index < ULTIMATE_BOT_MARKETS.length; index += SCAN_BATCH) {
            const batch = ULTIMATE_BOT_MARKETS.slice(index, index + SCAN_BATCH);
            const part = await Promise.all(
                batch.map(async market => {
                    try {
                        const prices = await fetchPrices(market.id, ENTRY_SCAN_DEPTH);
                        return scoreMarket(market.id, prices, mode);
                    } catch {
                        return scoreMarket(market.id, [], mode);
                    }
                })
            );
            scores.push(...part);
            setProgress(Math.min(ULTIMATE_BOT_MARKETS.length, index + batch.length));
        }

        const best = pickBestMarket(scores);
        const next = best ? toScanResult(best, mode) : null;
        if (next) applyResult(next);
        else setStatus('No Over / Under recovery on these markets. Scan again.');
        setScanning(false);
    };

    const loadScan = () => {
        const stored = readSavedScan();
        if (!stored) {
            setStatus('No saved scan yet. Run Deep Scan first.');
            return;
        }
        applyResult(stored);
    };

    const marketText = result?.label ?? 'Scan to find the best market';
    const tradeText = result?.tradeLabel ?? 'Waiting for scan';

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
                    onClick={() => setOpen(false)}
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
                            <button type='button' aria-label='Close' onClick={() => setOpen(false)}>
                                ×
                            </button>
                        </header>

                        <div className='entry-scanner__hero'>
                            <div>
                                <span className='entry-scanner__tag'>RECOVERY ENGINE</span>
                                <h3>Digits Scanner</h3>
                                <p>{heroCopy(mode)}</p>
                            </div>
                            <span className='entry-scanner__radar' aria-hidden='true' />
                        </div>

                        <div className='entry-scanner__modes' role='tablist' aria-label='Scan pair'>
                            <button
                                type='button'
                                role='tab'
                                aria-selected={mode === '01-08'}
                                className={classNames({ selected: mode === '01-08' })}
                                disabled={scanning}
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
                                disabled={scanning}
                                onClick={() => {
                                    setMode('02-07');
                                    setResult(current => (current?.mode === '02-07' ? current : null));
                                }}
                            >
                                OV 2 / UN 7
                            </button>
                        </div>

                        <div className='entry-scanner__grid'>
                            <Stat label='SCAN DEPTH' value={String(ENTRY_SCAN_DEPTH)} />
                            <Stat label='MODE' value={mode} />
                            <Stat label='TICKS' value={String(ENTRY_SCAN_DEPTH)} />
                            <Stat label='SELECTED MARKET' value={marketText} wide />
                            <Stat label='TRADE TYPE' value={tradeText} wide />
                        </div>

                        <p className='entry-scanner__status'>
                            <span aria-hidden='true' />
                            {scanning
                                ? `Scanning ${progress}/${ULTIMATE_BOT_MARKETS.length} markets`
                                : status}
                        </p>

                        <div className='entry-scanner__actions'>
                            <button
                                type='button'
                                className='entry-scanner__deep'
                                disabled={scanning}
                                onClick={() => void runDeepScan()}
                            >
                                {scanning ? 'Scanning…' : 'Deep Scan Markets'}
                            </button>
                            <button
                                type='button'
                                className='entry-scanner__load'
                                disabled={scanning || !saved}
                                onClick={loadScan}
                            >
                                Load Scan
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
};

const Stat = ({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) => (
    <div className={classNames('entry-scanner__stat', { 'is-wide': wide })}>
        <span>{label}</span>
        <strong>{value}</strong>
    </div>
);

export default EntryScanner;
