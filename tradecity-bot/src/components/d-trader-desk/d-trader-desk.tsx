import classNames from 'classnames';
import type { AccumulatorQuote } from '@/hooks/useAccumulatorProposal';
import './d-trader-desk.scss';

export const GROWTH_RATES = [0.01, 0.02, 0.03, 0.04, 0.05];

interface DTraderDeskProps {
    currency: string;
    tradingLocked: boolean;
    busy: boolean;
    notice: string | null;
    quote: AccumulatorQuote;
    stake: number;
    onStakeChange: (stake: number) => void;
    growthRate: number;
    onGrowthRateChange: (rate: number) => void;
    takeProfitOn: boolean;
    onTakeProfitToggle: (on: boolean) => void;
    takeProfit: number;
    onTakeProfitChange: (value: number) => void;
    copyTrading: boolean;
    onCopyTradingToggle: (on: boolean) => void;
    onBuy: () => void;
    /** The chart, owned by the panel so the ticket stays presentational. */
    chart: React.ReactNode;
}

const money = (value: number | null, currency: string) =>
    value == null ? '—' : `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

const Info = ({ label }: { label: string }) => (
    <span className='d-trader__info' role='img' aria-label={label} title={label}>
        <svg viewBox='0 0 24 24' aria-hidden='true'>
            <circle cx='12' cy='12' r='9' />
            <path d='M12 11v5M12 8h.01' />
        </svg>
    </span>
);

const DTraderDesk = ({
    currency,
    tradingLocked,
    busy,
    notice,
    quote,
    stake,
    onStakeChange,
    growthRate,
    onGrowthRateChange,
    takeProfitOn,
    onTakeProfitToggle,
    takeProfit,
    onTakeProfitChange,
    copyTrading,
    onCopyTradingToggle,
    onBuy,
    chart,
}: DTraderDeskProps) => {
    const stakeBelowMin = quote.minStake != null && stake < quote.minStake;
    const stakeAboveMax = quote.maxStake != null && stake > quote.maxStake;
    const stakeError = stakeBelowMin
        ? `Minimum stake is ${money(quote.minStake, currency)}`
        : stakeAboveMax
          ? `Maximum stake is ${money(quote.maxStake, currency)}`
          : null;

    const blocked = tradingLocked || busy || Boolean(stakeError) || !(stake > 0);

    return (
        <div className='d-trader'>
            <div className='d-trader__chart'>{chart}</div>

            <aside className='d-trader__ticket' aria-label='Trade parameters'>
                <p className='d-trader__learn'>Learn about this trade type</p>

                <div className='d-trader__type'>
                    <span className='d-trader__type-nav' aria-hidden='true'>
                        <svg viewBox='0 0 24 24'>
                            <path d='M15 6l-6 6 6 6' />
                        </svg>
                    </span>
                    <span className='d-trader__type-icon' aria-hidden='true'>
                        <svg viewBox='0 0 24 24'>
                            <path d='M3 17l4-6 4 3 4-7 6 4' />
                        </svg>
                    </span>
                    <strong>Accumulators</strong>
                </div>

                <div className='d-trader__copy'>
                    <span className='d-trader__copy-icon' aria-hidden='true'>
                        <svg viewBox='0 0 24 24'>
                            <circle cx='12' cy='12' r='2' fill='currentColor' stroke='none' />
                            <path d='M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7' />
                        </svg>
                    </span>
                    <span className='d-trader__copy-label'>Copy Trading</span>
                    <span className='d-trader__copy-state'>{copyTrading ? 'On' : 'Off'}</span>
                    <button
                        type='button'
                        role='switch'
                        aria-checked={copyTrading}
                        aria-label='Copy Trading'
                        className={classNames('d-trader__switch', { 'is-on': copyTrading })}
                        onClick={() => onCopyTradingToggle(!copyTrading)}
                    >
                        <i />
                    </button>
                </div>

                <section className='d-trader__field'>
                    <h3>
                        Growth rate <Info label='How much your payout grows with every tick' />
                    </h3>
                    <div className='d-trader__rates' role='radiogroup' aria-label='Growth rate'>
                        {GROWTH_RATES.map(rate => (
                            <button
                                key={rate}
                                type='button'
                                role='radio'
                                aria-checked={rate === growthRate}
                                className={classNames('d-trader__rate', { 'is-on': rate === growthRate })}
                                onClick={() => onGrowthRateChange(rate)}
                            >
                                {Math.round(rate * 100)}%
                            </button>
                        ))}
                    </div>
                </section>

                <section className='d-trader__field'>
                    <h3>Stake</h3>
                    <div className={classNames('d-trader__stake', { 'has-error': Boolean(stakeError) })}>
                        <button
                            type='button'
                            aria-label='Decrease stake'
                            onClick={() => onStakeChange(Math.max(0, Number((stake - 1).toFixed(2))))}
                        >
                            –
                        </button>
                        <input
                            type='number'
                            aria-label='Stake'
                            value={stake}
                            min={0}
                            step={1}
                            onChange={event => onStakeChange(Number(event.target.value))}
                        />
                        <span className='d-trader__stake-currency'>{currency}</span>
                        <button
                            type='button'
                            aria-label='Increase stake'
                            onClick={() => onStakeChange(Number((stake + 1).toFixed(2)))}
                        >
                            +
                        </button>
                    </div>
                    {stakeError ? <p className='d-trader__error'>{stakeError}</p> : null}
                </section>

                <section className='d-trader__field'>
                    <label className='d-trader__check'>
                        <input
                            type='checkbox'
                            checked={takeProfitOn}
                            onChange={event => onTakeProfitToggle(event.target.checked)}
                        />
                        <span>Take profit</span>
                        <Info label='Close the contract once profit reaches this amount' />
                    </label>
                    {takeProfitOn ? (
                        <div className='d-trader__stake'>
                            <input
                                type='number'
                                aria-label='Take profit amount'
                                value={takeProfit}
                                min={0}
                                step={1}
                                onChange={event => onTakeProfitChange(Number(event.target.value))}
                            />
                            <span className='d-trader__stake-currency'>{currency}</span>
                        </div>
                    ) : null}
                </section>

                <dl className='d-trader__readouts'>
                    <div>
                        <dt>Max. payout</dt>
                        <dd>{money(quote.maxPayout, currency)}</dd>
                    </div>
                    <div>
                        <dt>Max. ticks</dt>
                        <dd>{quote.maxTicks == null ? '—' : `${quote.maxTicks} ticks`}</dd>
                    </div>
                </dl>

                {quote.error ? <p className='d-trader__error'>{quote.error}</p> : null}
                {notice ? <p className='d-trader__error'>{notice}</p> : null}
                {tradingLocked ? <p className='d-trader__error'>Log in to place a trade.</p> : null}

                <button type='button' className='d-trader__buy' disabled={blocked} onClick={onBuy}>
                    <span className='d-trader__buy-icon' aria-hidden='true'>
                        <svg viewBox='0 0 24 24'>
                            <path d='M3 17l4-6 4 3 4-7 6 4' />
                        </svg>
                    </span>
                    {busy ? 'Buying…' : 'Buy'}
                </button>
            </aside>
        </div>
    );
};

export default DTraderDesk;
