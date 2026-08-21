import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { SIGNAL_MARKETS } from '@/constants/signal-markets';
import {
    initialParams,
    type ParamValues,
    SIGNAL_CATEGORIES,
    SIGNAL_TOOLS,
    type SignalTool,
    toolById,
    type ToolParam,
} from '@/constants/signal-tools';
import type { SignalHandoff, ToolReading } from '@/utils/signal-analysis';
import './signal-center-desk.scss';

type RunStatus = 'idle' | 'running' | 'paused';

interface SignalCenterDeskProps {
    market: string;
    onMarketChange: (market: string) => void;
    /** Quotes for the selected market, oldest first. */
    values: number[];
    /** Last digit of each quote, aligned with `values`. */
    digits: number[];
    onSendToBuilder: (handoff: SignalHandoff, toolLabel: string) => void;
}

const SignalCenterDesk = ({ market, onMarketChange, values, digits, onSendToBuilder }: SignalCenterDeskProps) => {
    const [view, setView] = useState<'tool' | 'catalog'>('tool');
    const [toolId, setToolId] = useState(SIGNAL_TOOLS[0]!.id);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [status, setStatus] = useState<RunStatus>('idle');
    const [snapshot, setSnapshot] = useState<ToolReading | null>(null);
    const [params, setParams] = useState<Record<string, ParamValues>>(() =>
        Object.fromEntries(SIGNAL_TOOLS.map(item => [item.id, initialParams(item)]))
    );

    const tool = toolById(toolId);
    const toolParams = params[tool.id] ?? {};
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!pickerOpen) return undefined;
        const close = (event: MouseEvent) => {
            if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [pickerOpen]);

    const collected = Math.min(values.length, tool.minTicks || values.length);
    const ready = values.length >= tool.minTicks;
    const missing = Math.max(0, tool.minTicks - values.length);

    const live = useMemo<ToolReading | null>(() => {
        if (!ready) return null;
        return tool.analyze({ values, digits, params: toolParams });
    }, [ready, tool, values, digits, toolParams]);

    const reading = status === 'paused' ? snapshot : status === 'running' ? live : null;

    function selectTool(id: string) {
        setToolId(id);
        setPickerOpen(false);
        setStatus('idle');
        setSnapshot(null);
        setView('tool');
    }

    function setParam(key: string, value: string | number) {
        setParams(previous => ({ ...previous, [tool.id]: { ...previous[tool.id], [key]: value } }));
    }

    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return SIGNAL_TOOLS.filter(item => {
            const inCategory = category === 'all' || item.category === category;
            const matches =
                !needle ||
                item.label.toLowerCase().includes(needle) ||
                item.description.toLowerCase().includes(needle);
            return inCategory && matches;
        });
    }, [search, category]);

    const lastDigit = digits.length ? digits[digits.length - 1] : null;

    return (
        <div className='signal-center'>
            <header className='signal-center__topbar'>
                <h2 className='signal-center__title'>Trading Tools Hub</h2>
                <div className='signal-center__views' role='group' aria-label='Layout'>
                    <button
                        type='button'
                        className={classNames('signal-center__view-btn', { 'is-on': view === 'tool' })}
                        aria-pressed={view === 'tool'}
                        aria-label='Single tool'
                        onClick={() => setView('tool')}
                    >
                        <svg viewBox='0 0 24 24' aria-hidden='true'>
                            <path d='M4 7h16M4 12h16M4 17h16' />
                        </svg>
                    </button>
                    <button
                        type='button'
                        className={classNames('signal-center__view-btn', { 'is-on': view === 'catalog' })}
                        aria-pressed={view === 'catalog'}
                        aria-label='All tools'
                        onClick={() => setView('catalog')}
                    >
                        <svg viewBox='0 0 24 24' aria-hidden='true'>
                            <rect x='4' y='4' width='7' height='7' rx='1.5' />
                            <rect x='13' y='4' width='7' height='7' rx='1.5' />
                            <rect x='4' y='13' width='7' height='7' rx='1.5' />
                            <rect x='13' y='13' width='7' height='7' rx='1.5' />
                        </svg>
                    </button>
                </div>
            </header>

            <div className='signal-center__scroll'>
                {view === 'catalog' ? (
                    <Catalog
                        search={search}
                        onSearch={setSearch}
                        category={category}
                        onCategory={setCategory}
                        tools={visible}
                        onPick={selectTool}
                    />
                ) : (
                    <>
                        <div className='signal-center__picker' ref={pickerRef}>
                            <button
                                type='button'
                                className='signal-center__picker-btn'
                                aria-expanded={pickerOpen}
                                aria-haspopup='listbox'
                                onClick={() => setPickerOpen(open => !open)}
                            >
                                <span className='signal-center__picker-icon'>{tool.icon}</span>
                                <span className='signal-center__picker-label'>{tool.label}</span>
                                <span className={classNames('signal-center__chevron', { 'is-open': pickerOpen })}>
                                    <svg viewBox='0 0 24 24' aria-hidden='true'>
                                        <path d='M6 9l6 6 6-6' />
                                    </svg>
                                </span>
                            </button>

                            {pickerOpen ? (
                                <ul className='signal-center__picker-list' role='listbox'>
                                    {SIGNAL_TOOLS.map(item => (
                                        <li key={item.id}>
                                            <button
                                                type='button'
                                                role='option'
                                                aria-selected={item.id === tool.id}
                                                className={classNames('signal-center__picker-option', {
                                                    'is-on': item.id === tool.id,
                                                })}
                                                onClick={() => selectTool(item.id)}
                                            >
                                                <span className='signal-center__picker-icon'>{item.icon}</span>
                                                <span>
                                                    <strong>{item.label}</strong>
                                                    <em>{item.description}</em>
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>

                        <div className='signal-center__stage'>
                            <span className='signal-center__glow is-left' aria-hidden='true' />

                            <div className='signal-center__console'>
                                <label className='signal-center__field'>
                                    <span className='signal-center__field-label'>SELECT MARKET:</span>
                                    <select
                                        className='signal-center__select'
                                        value={market}
                                        onChange={event => onMarketChange(event.target.value)}
                                    >
                                        <option value=''>-- Select Market --</option>
                                        {SIGNAL_MARKETS.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {tool.params.map(param => (
                                    <ParamField
                                        key={param.key}
                                        param={param}
                                        value={toolParams[param.key] ?? ''}
                                        onChange={value => setParam(param.key, value)}
                                    />
                                ))}

                                <div className='signal-center__tiles'>
                                    <div className='signal-center__tile'>
                                        <span>LAST DIGIT</span>
                                        <strong>{lastDigit == null ? '--' : lastDigit}</strong>
                                    </div>
                                    <div className='signal-center__tile'>
                                        <span>TICKS COLLECTED</span>
                                        <strong>
                                            {collected}/{tool.minTicks || values.length}
                                        </strong>
                                    </div>
                                </div>

                                <p className='signal-center__status'>
                                    {!market
                                        ? 'Select a market to begin.'
                                        : missing > 0
                                          ? `Collecting data... Need ${missing} more ticks`
                                          : status === 'running'
                                            ? 'Live — updating on every tick'
                                            : status === 'paused'
                                              ? 'Paused — showing the last snapshot'
                                              : 'Ready. Press ANALYZE to run.'}
                                </p>

                                <div className='signal-center__actions'>
                                    <button
                                        type='button'
                                        className='signal-center__btn is-analyze'
                                        disabled={!market || !ready}
                                        onClick={() => setStatus('running')}
                                    >
                                        ANALYZE
                                    </button>
                                    <button
                                        type='button'
                                        className='signal-center__btn is-pause'
                                        disabled={status !== 'running'}
                                        onClick={() => {
                                            setSnapshot(live);
                                            setStatus('paused');
                                        }}
                                    >
                                        PAUSE
                                    </button>
                                    <button
                                        type='button'
                                        className='signal-center__btn is-stop'
                                        disabled={status === 'idle'}
                                        onClick={() => {
                                            setStatus('idle');
                                            setSnapshot(null);
                                        }}
                                    >
                                        STOP
                                    </button>
                                </div>

                                <section className='signal-center__results'>
                                    <h3>ANALYSIS RESULTS</h3>
                                    {reading ? (
                                        <Results
                                            reading={reading}
                                            toolLabel={tool.label}
                                            onSendToBuilder={onSendToBuilder}
                                        />
                                    ) : (
                                        <p className='signal-center__empty'>
                                            No data available. Run analysis to see results.
                                        </p>
                                    )}
                                </section>
                            </div>

                            <span className='signal-center__glow is-right' aria-hidden='true' />
                        </div>
                    </>
                )}
            </div>

            <p className='signal-center__disclaimer'>
                <svg viewBox='0 0 24 24' aria-hidden='true'>
                    <path d='M12 4l9 16H3z' />
                    <path d='M12 10v4M12 17h.01' />
                </svg>
                Risk Disclaimer
            </p>
        </div>
    );
};

const ParamField = ({
    param,
    value,
    onChange,
}: {
    param: ToolParam;
    value: string | number;
    onChange: (value: string | number) => void;
}) => (
    <label className='signal-center__field'>
        <span className='signal-center__field-label'>{param.label}</span>
        {param.kind === 'select' ? (
            <select className='signal-center__select' value={String(value)} onChange={event => onChange(event.target.value)}>
                {param.placeholder ? <option value=''>{param.placeholder}</option> : null}
                {param.options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        ) : param.kind === 'digit' ? (
            <select
                className='signal-center__select'
                value={String(value)}
                onChange={event => onChange(Number(event.target.value))}
            >
                {Array.from({ length: 10 }, (_, digit) => (
                    <option key={digit} value={digit}>
                        {digit}
                    </option>
                ))}
            </select>
        ) : (
            <input
                className='signal-center__select'
                type='number'
                value={String(value)}
                min={param.min}
                max={param.max}
                step={param.step}
                onChange={event => onChange(Number(event.target.value))}
            />
        )}
    </label>
);

const Results = ({
    reading,
    toolLabel,
    onSendToBuilder,
}: {
    reading: ToolReading;
    toolLabel: string;
    onSendToBuilder: (handoff: SignalHandoff, toolLabel: string) => void;
}) => (
    <>
        <p className='signal-center__headline'>{reading.headline}</p>
        {reading.detail ? <p className='signal-center__detail'>{reading.detail}</p> : null}

        {reading.bars?.length ? (
            <div className='signal-center__bars'>
                {reading.bars.map((bar, index) => (
                    <div
                        key={`${bar.label}-${index}`}
                        className={classNames('signal-center__bar', `is-${bar.tone ?? 'flat'}`, {
                            'is-lead': bar.highlight,
                        })}
                    >
                        <span className='signal-center__bar-label'>{bar.label}</span>
                        <span className='signal-center__bar-track'>
                            <i style={{ width: `${Math.max(0, Math.min(100, bar.pct))}%` }} />
                        </span>
                        <span className='signal-center__bar-value'>{bar.pct.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        ) : null}

        {reading.rows.length ? (
            <dl className='signal-center__rows'>
                {reading.rows.map((row, index) => (
                    <div key={`${row.label}-${index}`} className={classNames('signal-center__row', `is-${row.tone ?? 'flat'}`)}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                    </div>
                ))}
            </dl>
        ) : null}

        {reading.handoff ? (
            <button
                type='button'
                className='signal-center__btn is-handoff'
                onClick={() => onSendToBuilder(reading.handoff!, toolLabel)}
            >
                SEND {reading.handoff.label.toUpperCase()} TO BOT BUILDER
            </button>
        ) : null}
    </>
);

const Catalog = ({
    search,
    onSearch,
    category,
    onCategory,
    tools,
    onPick,
}: {
    search: string;
    onSearch: (value: string) => void;
    category: string;
    onCategory: (value: string) => void;
    tools: SignalTool[];
    onPick: (id: string) => void;
}) => (
    <div className='signal-center__catalog'>
        <div className='signal-center__filters'>
            <input
                type='search'
                className='signal-center__search'
                placeholder='Search tools...'
                value={search}
                onChange={event => onSearch(event.target.value)}
                aria-label='Search tools'
            />
            <select
                className='signal-center__category'
                value={category}
                onChange={event => onCategory(event.target.value)}
                aria-label='Filter by category'
            >
                <option value='all'>All Categories</option>
                {SIGNAL_CATEGORIES.map(item => (
                    <option key={item} value={item}>
                        {item}
                    </option>
                ))}
            </select>
        </div>

        {SIGNAL_CATEGORIES.map(group => {
            const groupTools = tools.filter(item => item.category === group);
            if (!groupTools.length) return null;
            return (
                <section key={group} className='signal-center__group'>
                    <h3>{group}</h3>
                    <div className='signal-center__cards'>
                        {groupTools.map(item => (
                            <button
                                key={item.id}
                                type='button'
                                className='signal-center__card'
                                onClick={() => onPick(item.id)}
                            >
                                <span className='signal-center__card-icon'>{item.icon}</span>
                                <strong>{item.label}</strong>
                                <em>{item.description}</em>
                            </button>
                        ))}
                    </div>
                </section>
            );
        })}

        {!tools.length ? <p className='signal-center__empty-catalog'>No tools match that search.</p> : null}
    </div>
);

export default SignalCenterDesk;
