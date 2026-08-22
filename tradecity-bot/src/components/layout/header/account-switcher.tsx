import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces, standalone_routes } from '@/components/shared';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { Localize, localize } from '@deriv-com/translations';
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import './account-switcher.scss';

type TAccountTab = 'real' | 'demo';

const AccountMark = ({ isVirtual }: { isVirtual: boolean }) => (
    <span className='acc-mark-wrap' aria-hidden='true'>
        <span className='acc-mark-flag'>🇺🇸</span>
        <span
            className={classNames('acc-mark', isVirtual ? 'acc-mark--demo' : 'acc-mark--real')}
            data-testid='dt_acc_mark'
            data-mode={isVirtual ? 'demo' : 'real'}
        >
            {isVirtual ? 'D' : 'R'}
        </span>
    </span>
);

const Chevron = ({ className }: { className?: string }) => (
    <svg className={className} width='12' height='12' viewBox='0 0 12 12' fill='none' aria-hidden='true'>
        <path d='M2 4L6 8L10 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
);

const LogoutIcon = () => (
    <svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
        <path
            d='M6.5 2.5H3.5A1 1 0 002.5 3.5v9a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6'
            stroke='currentColor'
            strokeWidth='1.4'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
);

const AccountSwitcher = observer(({ activeAccount }: TAccountSwitcher) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isGroupOpen, setIsGroupOpen] = useState(true);
    const [tab, setTab] = useState<TAccountTab>('real');
    const [isResetting, setIsResetting] = useState(false);
    const [resetMessage, setResetMessage] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { accountList, activeLoginid } = useApiBase();
    const { client, run_panel } = useStore() ?? {};
    const handleLogout = useLogout();

    const is_bot_running = run_panel?.is_running || api_base.is_running;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const toggleDropdown = useCallback(() => {
        setIsOpen(prev => {
            if (!prev) {
                setTab(activeAccount?.isVirtual ? 'demo' : 'real');
                setResetMessage('');
            }
            return !prev;
        });
    }, [activeAccount?.isVirtual]);

    const handleAccountSelect = useCallback(
        (loginid: string) => {
            if (is_bot_running) return;
            localStorage.setItem('active_loginid', loginid);
            localStorage.setItem('account_type', isDemoAccount(loginid) ? 'demo' : 'real');
            try {
                const accountsList = JSON.parse(localStorage.getItem('accountsList') || '{}') as Record<string, string>;
                const token = accountsList[loginid];
                if (token) localStorage.setItem('authToken', token);
            } catch {
                // OAuth sessions keep the access token in sessionStorage
            }
            if (typeof client?.regenerateWebSocket === 'function') {
                client.regenerateWebSocket();
            } else {
                client?.checkAndRegenerateWebSocket();
            }
            setIsOpen(false);
        },
        [client, is_bot_running]
    );

    const handleResetBalance = useCallback(async () => {
        if (isResetting || is_bot_running) return;
        setIsResetting(true);
        setResetMessage('');
        try {
            const response = (await api_base?.api?.send({ topup_virtual: 1 })) as unknown as {
                error?: { message?: string };
                topup_virtual?: { amount?: number; currency?: string };
            };
            if (response?.error?.message) {
                setResetMessage(response.error.message);
            } else {
                setResetMessage(localize('Balance reset.'));
            }
        } catch (error) {
            const message = (error as { error?: { message?: string } })?.error?.message;
            setResetMessage(message || localize('Could not reset the balance. Try again.'));
        } finally {
            setIsResetting(false);
        }
    }, [is_bot_running, isResetting]);

    const formattedAccounts = useMemo(() => {
        if (!accountList) return [];
        return accountList
            .map(account => {
                const liveBalance = client?.all_accounts_balance?.accounts?.[account.loginid]?.balance;
                const amount = liveBalance ?? account.balance ?? 0;
                return {
                    loginid: account.loginid,
                    currency: account.currency,
                    balance: addComma(Number(amount).toFixed(getDecimalPlaces(account.currency))),
                    isVirtual: isDemoAccount(account.loginid),
                    isActive: account.loginid === activeLoginid,
                };
            })
            .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));
    }, [accountList, activeLoginid, client?.all_accounts_balance]);

    const visibleAccounts = useMemo(
        () => formattedAccounts.filter(account => (tab === 'demo' ? account.isVirtual : !account.isVirtual)),
        [formattedAccounts, tab]
    );

    if (!activeAccount) return null;

    const { isVirtual, currency, balance } = activeAccount;
    const headerBalance = currency
        ? `${balance} ${getCurrencyDisplayCode(currency)}`
        : localize('No currency assigned');

    return (
        <div className='acc-info__wrapper' ref={wrapperRef}>
            <AccountInfoWrapper>
                <div
                    data-testid='dt_acc_info'
                    id='dt_core_account-info_acc-info'
                    role='button'
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-haspopup='dialog'
                    aria-label={isVirtual ? localize('Demo account') : localize('Real account')}
                    className={classNames('acc-info', 'acc-info--compact', 'acc-info--interactive', {
                        'acc-info--is-virtual': isVirtual,
                    })}
                    onClick={toggleDropdown}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleDropdown();
                        }
                    }}
                >
                    <span className='acc-info__trigger'>
                        <span className='acc-mark-flag' aria-hidden='true'>
                            🇺🇸
                        </span>
                        <span className='acc-info__balance acc-info__balance--trigger' data-testid='dt_acc_balance'>
                            {headerBalance}
                        </span>
                    </span>
                    <span
                        className={classNames('acc-info__select-arrow', {
                            'acc-info__select-arrow--invert': isOpen,
                        })}
                    >
                        <Chevron />
                    </span>
                </div>
            </AccountInfoWrapper>
            {isOpen && (
                <div className='acc-dropdown' role='dialog' aria-label={localize('Account switcher')}>
                    <div className='acc-dropdown__tabs' role='tablist'>
                        <button
                            type='button'
                            role='tab'
                            aria-selected={tab === 'real'}
                            className={classNames('acc-dropdown__tab', {
                                'acc-dropdown__tab--active': tab === 'real',
                            })}
                            onClick={() => setTab('real')}
                        >
                            <Localize i18n_default_text='Real' />
                        </button>
                        <button
                            type='button'
                            role='tab'
                            aria-selected={tab === 'demo'}
                            className={classNames('acc-dropdown__tab', {
                                'acc-dropdown__tab--active': tab === 'demo',
                            })}
                            onClick={() => setTab('demo')}
                        >
                            <Localize i18n_default_text='Demo' />
                        </button>
                    </div>

                    <div className='acc-dropdown__group'>
                        <button
                            type='button'
                            className='acc-dropdown__group-header'
                            aria-expanded={isGroupOpen}
                            onClick={() => setIsGroupOpen(prev => !prev)}
                        >
                            <Text size='xs' weight='bold'>
                                <Localize i18n_default_text='Deriv account' />
                            </Text>
                            <Chevron
                                className={classNames('acc-dropdown__group-chevron', {
                                    'acc-dropdown__group-chevron--invert': isGroupOpen,
                                })}
                            />
                        </button>

                        {isGroupOpen && (
                            <div className='acc-dropdown__list' role='listbox'>
                                {visibleAccounts.length === 0 && (
                                    <p className='acc-dropdown__empty'>
                                        {tab === 'demo' ? (
                                            <Localize i18n_default_text='No demo account yet.' />
                                        ) : (
                                            <Localize i18n_default_text='No real account yet.' />
                                        )}
                                    </p>
                                )}
                                {visibleAccounts.map(account => (
                                    <div
                                        key={account.loginid}
                                        role='option'
                                        aria-selected={account.isActive}
                                        aria-disabled={is_bot_running}
                                        tabIndex={0}
                                        className={classNames('acc-dropdown__account', {
                                            'acc-dropdown__account--selected': account.isActive,
                                            'acc-dropdown__account--virtual': account.isVirtual,
                                            'acc-dropdown__account--locked': is_bot_running && !account.isActive,
                                        })}
                                        onClick={() => !account.isActive && handleAccountSelect(account.loginid)}
                                        onKeyDown={e => {
                                            if (!account.isActive && (e.key === 'Enter' || e.key === ' ')) {
                                                e.preventDefault();
                                                handleAccountSelect(account.loginid);
                                            }
                                        }}
                                    >
                                        <AccountMark isVirtual={account.isVirtual} />
                                        <div className='acc-dropdown__copy'>
                                            <Text
                                                size='xs'
                                                weight='bold'
                                                className={classNames('acc-dropdown__account-type', {
                                                    'acc-dropdown__account-type--virtual': account.isVirtual,
                                                })}
                                            >
                                                {account.isVirtual ? (
                                                    <Localize i18n_default_text='Demo' />
                                                ) : (
                                                    getCurrencyDisplayCode(account.currency)
                                                )}
                                            </Text>
                                            <Text size='xxxs' className='acc-dropdown__loginid'>
                                                {account.loginid}
                                            </Text>
                                        </div>
                                        <div className='acc-dropdown__actions'>
                                            <Text
                                                size='xs'
                                                weight='bold'
                                                className='acc-dropdown__balance'
                                                data-testid='dt_balance'
                                            >
                                                {account.currency ? (
                                                    `${account.balance} ${getCurrencyDisplayCode(account.currency)}`
                                                ) : (
                                                    <Localize i18n_default_text='No currency assigned' />
                                                )}
                                            </Text>
                                            {account.isVirtual && account.isActive && (
                                                <button
                                                    type='button'
                                                    className='acc-dropdown__reset'
                                                    disabled={isResetting || is_bot_running}
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleResetBalance();
                                                    }}
                                                >
                                                    <Localize i18n_default_text='Reset balance' />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {is_bot_running && (
                        <p className='acc-dropdown__note'>
                            <Localize i18n_default_text='Stop the bot to switch accounts.' />
                        </p>
                    )}
                    {resetMessage && <p className='acc-dropdown__note'>{resetMessage}</p>}

                    <a
                        className='acc-dropdown__hub'
                        href={standalone_routes.traders_hub}
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        <Localize i18n_default_text="Looking for CFD accounts? Go to Trader's Hub" />
                    </a>

                    <button type='button' className='acc-dropdown__logout' onClick={handleLogout}>
                        <Localize i18n_default_text='Logout' />
                        <LogoutIcon />
                    </button>
                </div>
            )}
        </div>
    );
});

export default AccountSwitcher;
