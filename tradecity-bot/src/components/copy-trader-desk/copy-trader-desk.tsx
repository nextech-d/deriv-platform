import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { activeLoginid, setCopyRunningHint } from '@/utils/copy-mirror';
import {
    accountsForMode,
    accountTally,
    type CopyAccount,
    copyApi,
    type CopyMode,
    type CopyState,
    EMPTY_COPY_STATE,
} from '@/utils/copy-trading';
import './copy-trader-desk.scss';

const MODES: { id: CopyMode; title: string; hint: string }[] = [
    { id: 'demo', title: 'Demo accounts', hint: 'Practice funds' },
    { id: 'real', title: 'Real accounts', hint: 'Real funds' },
];

interface CopyTraderDeskProps {
    isLoggedIn: boolean;
}

const CopyTraderDesk = ({ isLoggedIn }: CopyTraderDeskProps) => {
    const [state, setState] = useState<CopyState>(EMPTY_COPY_STATE);
    const [tokenInput, setTokenInput] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const running = Boolean(state.session?.running);
    const mode = state.mode;

    useEffect(() => {
        setCopyRunningHint(running);
    }, [running]);
    const modeLabel = mode === 'demo' ? 'Demo' : 'Real';

    const tallies = useMemo(
        () => ({ demo: accountTally(state.accounts, 'demo'), real: accountTally(state.accounts, 'real') }),
        [state.accounts]
    );

    // Trades are never copied back onto the account that placed them, so a
    // selection of only that account would run without copying anything.
    const source = activeLoginid();
    const copiesNothing = useMemo(() => {
        const enabled = accountsForMode(state.accounts, mode).filter(account => account.enabled);
        return enabled.length > 0 && enabled.every(account => account.loginid === source);
    }, [state.accounts, mode, source]);

    async function run(action: () => Promise<CopyState>): Promise<boolean> {
        setBusy(true);
        setError('');
        try {
            setState(await action());
            return true;
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Something went wrong.');
            return false;
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        copyApi
            .load()
            .then(next => {
                if (!cancelled) setState(next);
            })
            .catch(caught => {
                if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load your accounts.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn]);

    if (!isLoggedIn) {
        return (
            <div className='copy-trader-desk'>
                <div className='copy-trader-desk__inner'>
                    <Heading running={false} />
                    <div className='copy-trader-desk__card copy-trader-desk__empty'>
                        <h3>Sign in first</h3>
                        <p>Log in to add extra-account PATs and copy trades.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='copy-trader-desk'>
            <div className='copy-trader-desk__inner'>
                <Heading running={running} />

                {error ? <p className='copy-trader-desk__error'>{error}</p> : null}

                <section className='copy-trader-desk__card copy-trader-desk__pat'>
                    <div className='copy-trader-desk__pat-copy'>
                        <h3>Add a PAT</h3>
                        <p>Trade-scoped PAT for another account. We encrypt it.</p>
                    </div>
                    <form
                        className='copy-trader-desk__pat-form'
                        onSubmit={event => {
                            event.preventDefault();
                            const value = tokenInput.trim();
                            if (!value) return;
                            // Keep the token in the box when it is rejected so it can be corrected.
                            void run(() => copyApi.addToken(value)).then(ok => {
                                if (ok) setTokenInput('');
                            });
                        }}
                    >
                        <label htmlFor='copy-pat'>Personal Access Token</label>
                        <div className='copy-trader-desk__pat-row'>
                            <input
                                id='copy-pat'
                                type={showToken ? 'text' : 'password'}
                                autoComplete='off'
                                spellCheck={false}
                                placeholder='Paste a trade-scoped PAT for another account'
                                value={tokenInput}
                                onChange={event => setTokenInput(event.target.value)}
                            />
                            <button
                                type='button'
                                className='copy-trader-desk__ghost-btn'
                                onClick={() => setShowToken(value => !value)}
                            >
                                {showToken ? 'Hide' : 'Show'}
                            </button>
                            <button
                                type='submit'
                                className='copy-trader-desk__primary-btn'
                                disabled={busy || !tokenInput.trim()}
                            >
                                Add token
                            </button>
                        </div>
                        {state.tokens.length ? (
                            <ul className='copy-trader-desk__token-list'>
                                {state.tokens.map(token => (
                                    <li key={token.id}>
                                        <code>{token.maskedToken}</code>
                                        <span>
                                            {token.accountIds.length} account
                                            {token.accountIds.length === 1 ? '' : 's'}
                                        </span>
                                        <button
                                            type='button'
                                            disabled={busy || running}
                                            onClick={() => run(() => copyApi.removeToken(token.id))}
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </form>
                </section>

                <section className='copy-trader-desk__card copy-trader-desk__mode'>
                    <span className='copy-trader-desk__eyebrow'>Copy trading mode</span>
                    <h3>Where trades run</h3>
                    <p>Demo and real never mix.</p>

                    <div className='copy-trader-desk__mode-row'>
                        <div className='copy-trader-desk__mode-options' role='radiogroup' aria-label='Copy trading mode'>
                            {MODES.map(option => {
                                const tally = tallies[option.id];
                                return (
                                    <button
                                        key={option.id}
                                        type='button'
                                        role='radio'
                                        aria-checked={mode === option.id}
                                        disabled={busy || running}
                                        className={classNames('copy-trader-desk__mode-option', {
                                            selected: mode === option.id,
                                        })}
                                        onClick={() => run(() => copyApi.setMode(option.id))}
                                    >
                                        <span className='copy-trader-desk__radio' aria-hidden='true' />
                                        <span className='copy-trader-desk__mode-text'>
                                            <strong>{option.title}</strong>
                                            <em>{option.hint}</em>
                                        </span>
                                        <span className='copy-trader-desk__count'>
                                            {tally.enabled}/{tally.total}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className='copy-trader-desk__start'>
                            {state.blocker && !running ? (
                                <p className='copy-trader-desk__blocker'>
                                    <span aria-hidden='true'>●</span> {state.blocker}
                                </p>
                            ) : null}
                            {!state.blocker && copiesNothing ? (
                                <p className='copy-trader-desk__blocker'>
                                    <span aria-hidden='true'>●</span> Enable another {mode} account. Copy
                                    will not run on {source || 'this desk'}.
                                </p>
                            ) : null}
                            <button
                                type='button'
                                className='copy-trader-desk__primary-btn copy-trader-desk__start-btn'
                                disabled={
                                    busy || loading || (!running && (Boolean(state.blocker) || copiesNothing))
                                }
                                onClick={() => run(() => (running ? copyApi.stop() : copyApi.start()))}
                            >
                                {running ? `Stop ${modeLabel} copy` : `Start ${modeLabel} copy`}
                            </button>
                        </div>
                    </div>
                </section>

                <div className='copy-trader-desk__grid'>
                    <AccountCard
                        variant='real'
                        title='Real accounts'
                        blurb='Uses cash balances.'
                        accounts={accountsForMode(state.accounts, 'real')}
                        tally={tallies.real}
                        busy={busy || running}
                        sourceLoginid={source}
                        onToggle={(accountId, enabled) => run(() => copyApi.setEnabled(accountId, enabled))}
                    />
                    <AccountCard
                        variant='demo'
                        title='Demo accounts'
                        blurb='Uses virtual balances.'
                        accounts={accountsForMode(state.accounts, 'demo')}
                        tally={tallies.demo}
                        busy={busy || running}
                        sourceLoginid={source}
                        onToggle={(accountId, enabled) => run(() => copyApi.setEnabled(accountId, enabled))}
                    />
                </div>
            </div>
        </div>
    );
};

const Heading = ({ running }: { running: boolean }) => (
    <header className='copy-trader-desk__header'>
        <div>
            <span className='copy-trader-desk__eyebrow'>Multi-account trading</span>
            <h2>Copy trading accounts</h2>
            <p>Add extra-account PATs. Copy will not run on the desk that placed the trade.</p>
        </div>
        <span className={classNames('copy-trader-desk__status', { running })}>
            <span aria-hidden='true'>●</span> {running ? 'Copy trading running' : 'Copy trading paused'}
        </span>
    </header>
);

interface AccountCardProps {
    variant: CopyMode;
    title: string;
    blurb: string;
    accounts: CopyAccount[];
    tally: { enabled: number; total: number };
    busy: boolean;
    sourceLoginid: string;
    onToggle: (accountId: string, enabled: boolean) => void;
}

const AccountCard = ({
    variant,
    title,
    blurb,
    accounts,
    tally,
    busy,
    sourceLoginid,
    onToggle,
}: AccountCardProps) => (
    <section className={classNames('copy-trader-desk__card copy-trader-desk__accounts', `is-${variant}`)}>
        <div className='copy-trader-desk__accounts-head'>
            <span className='copy-trader-desk__avatar' aria-hidden='true'>
                {variant === 'real' ? 'R' : 'D'}
            </span>
            <div>
                <h3>{title}</h3>
                <p>{blurb}</p>
                <strong className='copy-trader-desk__tally'>
                    {tally.enabled} enabled · {tally.total} total
                </strong>
            </div>
        </div>

        {accounts.length ? (
            <ul className='copy-trader-desk__account-list'>
                {accounts.map(account => (
                    <li key={account.accountId}>
                        <label>
                            <input
                                type='checkbox'
                                checked={account.enabled}
                                disabled={busy}
                                onChange={event => onToggle(account.accountId, event.target.checked)}
                            />
                            <span className='copy-trader-desk__loginid'>
                                {account.loginid}
                                {account.loginid === sourceLoginid ? ' · this desk' : ''}
                            </span>
                        </label>
                        <span className='copy-trader-desk__currency'>{account.currency}</span>
                    </li>
                ))}
            </ul>
        ) : (
            <div className='copy-trader-desk__empty-state'>
                <span className='copy-trader-desk__empty-icon' aria-hidden='true'>
                    ∿
                </span>
                <h4>No {variant} accounts</h4>
                <p>Add a PAT for another account above.</p>
            </div>
        )}
    </section>
);

export default CopyTraderDesk;
