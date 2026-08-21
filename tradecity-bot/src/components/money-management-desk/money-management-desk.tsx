import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import './money-management-desk.scss';

interface DayRow {
    day: number;
    startingCapital: number;
    expectedProfit: number;
    totalPnl: number;
    actualProfit: string;
    achieved: boolean;
}

interface SavedPlan {
    capital: number;
    dailyGain: number;
    totalDays: number;
    actuals: Record<number, string>;
    rollActuals: boolean;
}

interface MoneyManagementDeskProps {
    signedIn?: boolean;
    formatLocal?: (value: number) => string;
}

const PLAN_KEY = 'tc-money-plan';
const SESSION_KEY = 'tc-money-plan-session';

function dollars(n: number): string {
    return `$${n.toFixed(2)}`;
}

function readPlan(raw: string | null): SavedPlan | null {
    if (!raw) return null;
    try {
        const saved = JSON.parse(raw) as Partial<SavedPlan>;
        return {
            capital: Math.max(0, Number(saved.capital) || 0),
            dailyGain: Math.max(0, Number(saved.dailyGain) || 0),
            totalDays: Math.max(1, Math.min(365, Number(saved.totalDays) || 1)),
            actuals: saved.actuals ?? {},
            rollActuals: saved.rollActuals !== false,
        };
    } catch {
        return null;
    }
}

const MoneyManagementDesk = ({ signedIn = false, formatLocal = dollars }: MoneyManagementDeskProps) => {
    const [capital, setCapital] = useState(10);
    const [dailyGain, setDailyGain] = useState(10);
    const [totalDays, setTotalDays] = useState(5);
    const [actuals, setActuals] = useState<Record<number, string>>({});
    const [rollActuals, setRollActuals] = useState(true);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const saved =
            (signedIn ? readPlan(window.localStorage.getItem(PLAN_KEY)) : null) ??
            readPlan(window.sessionStorage.getItem(SESSION_KEY));
        if (saved) {
            setCapital(saved.capital);
            setDailyGain(saved.dailyGain);
            setTotalDays(saved.totalDays);
            setActuals(saved.actuals);
            setRollActuals(saved.rollActuals);
        }
        setHydrated(true);
    }, [signedIn]);

    useEffect(() => {
        if (!hydrated) return;
        const payload = JSON.stringify({ capital, dailyGain, totalDays, actuals, rollActuals });
        window.sessionStorage.setItem(SESSION_KEY, payload);
        if (signedIn) window.localStorage.setItem(PLAN_KEY, payload);
    }, [signedIn, hydrated, capital, dailyGain, totalDays, actuals, rollActuals]);

    const rows = useMemo<DayRow[]>(() => {
        const result: DayRow[] = [];
        let current = capital;
        const rate = dailyGain / 100;
        for (let d = 1; d <= totalDays; d++) {
            const profit = current * rate;
            const total = current + profit;
            const actual = actuals[d] ?? '';
            const parsed = parseFloat(actual);
            const hasActual = actual !== '' && Number.isFinite(parsed);
            result.push({
                day: d,
                startingCapital: current,
                expectedProfit: profit,
                totalPnl: total,
                actualProfit: actual,
                achieved: hasActual && parsed >= profit,
            });
            current = rollActuals && hasActual ? current + parsed : total;
        }
        return result;
    }, [capital, dailyGain, totalDays, actuals, rollActuals]);

    const expectedFinal = capital * (1 + dailyGain / 100) ** totalDays;
    const expectedGain = expectedFinal - capital;
    const expectedGainPct = capital > 0 ? (expectedGain / capital) * 100 : 0;
    const actualSum = rows.reduce((sum, row) => {
        const parsed = parseFloat(row.actualProfit);
        return Number.isFinite(parsed) ? sum + parsed : sum;
    }, 0);
    const book = capital + actualSum;
    const logged = rows.filter(row => row.actualProfit !== '').length;
    const hits = rows.filter(row => row.achieved).length;

    function resetPlan() {
        setCapital(10);
        setDailyGain(10);
        setTotalDays(5);
        setActuals({});
        setRollActuals(true);
        window.sessionStorage.removeItem(SESSION_KEY);
        if (signedIn) window.localStorage.removeItem(PLAN_KEY);
    }

    function setDayCount(next: number) {
        const days = Math.max(1, Math.min(365, next));
        setTotalDays(days);
        setActuals(prev => {
            const clipped: Record<number, string> = {};
            for (const [key, value] of Object.entries(prev)) {
                const day = Number(key);
                if (day >= 1 && day <= days && value !== '') clipped[day] = value;
            }
            return clipped;
        });
    }

    function setActual(day: number, value: string) {
        setActuals(prev => {
            const next = { ...prev };
            if (value.trim() === '') delete next[day];
            else next[day] = value;
            return next;
        });
    }

    function printPlan() {
        const previous = document.title;
        document.title = 'TradeCity money plan';
        window.print();
        document.title = previous;
    }

    return (
        <div className='money-mgmt'>
            <header className='money-mgmt-toolbar'>
                <h1>Money Management</h1>
                <div className='money-mgmt-toolbar-status'>
                    <span className='money-mgmt-chip'>{totalDays} days</span>
                    <span className='money-mgmt-chip'>{formatLocal(capital)} start</span>
                    <span className={classNames('money-mgmt-chip', { 'is-hit': hits > 0 })}>
                        {hits}/{logged || totalDays} hit
                    </span>
                </div>
            </header>

            <div className='money-mgmt-body'>
                <div className='money-mgmt-fields'>
                    <label>
                        <span>Starting capital</span>
                        <input
                            type='number'
                            value={capital}
                            min={0}
                            step={0.01}
                            inputMode='decimal'
                            onChange={event => setCapital(Math.max(0, Number(event.target.value) || 0))}
                        />
                    </label>
                    <label>
                        <span>Daily gain (%)</span>
                        <input
                            type='number'
                            value={dailyGain}
                            min={0}
                            max={1000}
                            step={0.1}
                            inputMode='decimal'
                            onChange={event =>
                                setDailyGain(Math.max(0, Math.min(1000, Number(event.target.value) || 0)))
                            }
                        />
                    </label>
                    <label>
                        <span>Total days</span>
                        <input
                            type='number'
                            value={totalDays}
                            min={1}
                            max={365}
                            onChange={event => setDayCount(Number(event.target.value) || 1)}
                        />
                    </label>
                </div>

                <label className='money-mgmt-toggle'>
                    <input
                        type='checkbox'
                        checked={rollActuals}
                        onChange={event => setRollActuals(event.target.checked)}
                    />
                    Compound logged profits into the next day&apos;s start
                </label>

                <div className='money-mgmt-kpis'>
                    <Kpi label='Expected final' value={formatLocal(expectedFinal)} />
                    <Kpi label='Logged book' value={formatLocal(book)} />
                    <Kpi label='Hit rate' value={logged ? `${hits}/${logged}` : '—'} />
                </div>

                <section className='money-mgmt-plan'>
                    <h2>Your plan</h2>
                    <div className='money-mgmt-table-wrap'>
                        <table>
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    <th>Starting capital</th>
                                    <th>Expected profit</th>
                                    <th>Total PnL</th>
                                    <th>Actual profit</th>
                                    <th>Achieved</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr
                                        key={row.day}
                                        className={classNames({
                                            'is-hit': row.achieved,
                                            'is-miss': row.actualProfit !== '' && !row.achieved,
                                        })}
                                    >
                                        <td>{row.day}</td>
                                        <td>{formatLocal(row.startingCapital)}</td>
                                        <td>{formatLocal(row.expectedProfit)}</td>
                                        <td>{formatLocal(row.totalPnl)}</td>
                                        <td>
                                            <input
                                                type='text'
                                                inputMode='decimal'
                                                placeholder='Enter actual'
                                                value={row.actualProfit}
                                                onChange={event => setActual(row.day, event.target.value)}
                                                aria-label={`Actual profit day ${row.day}`}
                                            />
                                        </td>
                                        <td>
                                            <span
                                                className={classNames('money-mgmt-flag', {
                                                    'is-yes': row.actualProfit !== '' && row.achieved,
                                                    'is-no': row.actualProfit !== '' && !row.achieved,
                                                })}
                                            >
                                                {row.actualProfit === '' ? '—' : row.achieved ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {!signedIn ? (
                    <div className='money-mgmt-notice'>
                        <p>This tab keeps the plan for now. Log in with Deriv to save it on this device.</p>
                    </div>
                ) : (
                    <p className='money-mgmt-saved'>Plan saved on this device.</p>
                )}

                <div className='money-mgmt-actions'>
                    <button type='button' className='money-mgmt-cta is-ink' onClick={printPlan}>
                        Download as PDF
                    </button>
                    <button type='button' className='money-mgmt-cta is-ghost' onClick={resetPlan}>
                        Reset plan
                    </button>
                </div>

                <p className='money-mgmt-summary'>
                    Expected final {formatLocal(expectedFinal)} · total gain {formatLocal(expectedGain)} (
                    {expectedGainPct.toFixed(2)}%)
                    {logged ? ` · logged P/L ${formatLocal(actualSum)}` : ''}
                </p>
            </div>
        </div>
    );
};

const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className='money-mgmt-kpi'>
        <p>{label}</p>
        <strong>{value}</strong>
    </div>
);

export default MoneyManagementDesk;
