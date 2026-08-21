import classNames from 'classnames';
import type { OpenContractRecord } from '@/hooks/useBulkTrading';

export type TradesDrawerTab = 'summary' | 'transactions' | 'journal';

interface TradesDrawerProps {
    open: boolean;
    tab: TradesDrawerTab;
    onTabChange: (tab: TradesDrawerTab) => void;
    onClose: () => void;
    contracts?: OpenContractRecord[];
    formatLocal?: (value: number) => string;
    onCloseContract?: (contractId: number) => void;
    closingId?: number | null;
    journal?: string[];
    onReset?: () => void;
}

const TABS: TradesDrawerTab[] = ['summary', 'transactions', 'journal'];

function tabLabel(tab: TradesDrawerTab): string {
    return tab.charAt(0).toUpperCase() + tab.slice(1);
}

const TradesDrawer = ({
    open,
    tab,
    onTabChange,
    onClose,
    contracts = [],
    formatLocal = value => `$${value.toFixed(2)}`,
    onCloseContract,
    closingId = null,
    journal = [],
    onReset,
}: TradesDrawerProps) => {
    if (!open) return null;

    const totalStake = contracts.reduce((sum, contract) => sum + contract.buyPrice, 0);
    const totalPnl = contracts.reduce((sum, contract) => sum + (contract.profit ?? 0), 0);
    const totalPayout = contracts.reduce((sum, contract) => {
        if (contract.isSold) return sum + contract.buyPrice + (contract.profit ?? 0);
        return sum + contract.buyPrice;
    }, 0);
    const won = contracts.filter(contract => contract.isSold && (contract.profit ?? 0) > 0).length;
    const lost = contracts.filter(contract => contract.isSold && (contract.profit ?? 0) < 0).length;
    const currency = contracts[0]?.currency ?? 'USD';
    const hasSession = contracts.length > 0 || journal.length > 0;

    return (
        <aside className='trades-drawer' aria-label='Trades'>
            <div className='trades-drawer-tabs'>
                {TABS.map(item => (
                    <button
                        key={item}
                        type='button'
                        className={classNames('trades-drawer-tab', { 'is-on': tab === item })}
                        onClick={() => onTabChange(item)}
                    >
                        {tabLabel(item)}
                    </button>
                ))}
                <button type='button' className='trades-drawer-close' onClick={onClose} aria-label='Close trades'>
                    ✕
                </button>
            </div>

            <div className='trades-drawer-body'>
                {tab === 'summary' ? (
                    <div className='trades-drawer-summary'>
                        {contracts.length === 0 ? (
                            <p className='trades-drawer-empty'>
                                When you&apos;re ready to trade, place a ticket. You&apos;ll be able to track
                                performance here.
                            </p>
                        ) : null}
                        <dl>
                            {[
                                ['Total stake', `${totalStake.toFixed(2)} ${currency}`],
                                ['Total payout', `${totalPayout.toFixed(2)} ${currency}`],
                                ['No. of runs', String(contracts.length)],
                                ['Contracts lost', String(lost)],
                                ['Contracts won', String(won)],
                                ['Total profit/loss', `${totalPnl.toFixed(2)} ${currency}`],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt>{label}</dt>
                                    <dd
                                        className={
                                            label === 'Total profit/loss'
                                                ? totalPnl >= 0
                                                    ? 'is-up'
                                                    : 'is-down'
                                                : undefined
                                        }
                                    >
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <button type='button' className='trades-drawer-reset' disabled={!hasSession} onClick={onReset}>
                            Reset
                        </button>
                    </div>
                ) : null}

                {tab === 'transactions' ? (
                    contracts.length === 0 ? (
                        <p className='trades-drawer-empty'>No transactions yet.</p>
                    ) : (
                        <ul className='trades-drawer-list'>
                            {contracts.map(contract => {
                                const pnl = contract.profit ?? 0;
                                const closing = closingId === contract.contractId;
                                return (
                                    <li key={contract.contractId}>
                                        <div>
                                            <strong>
                                                {contract.symbol}
                                                <span>#{contract.contractId}</span>
                                            </strong>
                                            <em>
                                                Stake {formatLocal(contract.buyPrice)}
                                                {contract.status ? ` · ${contract.status}` : ''}
                                                {contract.isSold ? ' · Closed' : ' · Open'}
                                            </em>
                                        </div>
                                        <div className='trades-drawer-row-side'>
                                            <b className={pnl >= 0 ? 'is-up' : 'is-down'}>
                                                {pnl >= 0 ? '+' : ''}
                                                {pnl.toFixed(2)}
                                            </b>
                                            {!contract.isSold && onCloseContract ? (
                                                <button
                                                    type='button'
                                                    className='trades-drawer-close-trade'
                                                    disabled={closing}
                                                    onClick={() => onCloseContract(contract.contractId)}
                                                >
                                                    {closing ? '…' : 'Close'}
                                                </button>
                                            ) : null}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )
                ) : null}

                {tab === 'journal' ? (
                    journal.length === 0 ? (
                        <p className='trades-drawer-empty'>Journal entries will appear here.</p>
                    ) : (
                        <ul className='trades-drawer-journal'>
                            {journal.map((line, index) => (
                                <li key={`${line}-${index}`}>{line}</li>
                            ))}
                        </ul>
                    )
                ) : null}
            </div>
        </aside>
    );
};

export default TradesDrawer;
