import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AccountSwitcher, { DESIGN_PREVIEW_ACCOUNT } from '../account-switcher';

const mockCheckAndRegenerateWebSocket = jest.fn();
const mockRegenerateWebSocket = jest.fn();
const mockLogout = jest.fn();
const mockSend = jest.fn(() => Promise.resolve({ topup_virtual: { amount: 10000, currency: 'USD' } }));

const mockAccountList = [
    { loginid: 'CR123', currency: 'USD', balance: 100, is_virtual: 0 },
    { loginid: 'VRTC456', currency: 'USD', balance: 9992.15, is_virtual: 1 },
];

jest.mock('@/hooks/useApiBase', () => ({
    useApiBase: jest.fn(() => ({
        accountList: mockAccountList,
        activeLoginid: 'CR123',
    })),
}));

jest.mock('@/hooks/useStore', () => ({
    useStore: jest.fn(() => ({
        client: {
            checkAndRegenerateWebSocket: mockCheckAndRegenerateWebSocket,
            regenerateWebSocket: mockRegenerateWebSocket,
        },
        run_panel: { is_running: false },
    })),
}));

jest.mock('@/hooks/useLogout', () => ({
    useLogout: jest.fn(() => mockLogout),
}));

jest.mock('@/external/bot-skeleton/services/api/api-base', () => ({
    api_base: { is_running: false, api: { send: (...args: unknown[]) => mockSend(...(args as [])) } },
}));

jest.mock('@/services/derivws-accounts.service', () => ({
    DerivWSAccountsService: {
        getStoredAccounts: jest.fn(() => null),
        fetchAccountsList: jest.fn(() => Promise.resolve([])),
    },
}));

jest.mock('@/services/oauth-token-exchange.service', () => ({
    OAuthTokenExchangeService: {
        getAccessToken: jest.fn(() => null),
    },
}));

jest.mock('@deriv-com/translations', () => ({
    Localize: ({ i18n_default_text }: { i18n_default_text: string }) => <span>{i18n_default_text}</span>,
    localize: (text: string) => text,
}));

jest.mock('@/components/shared', () => ({
    addComma: (val: string) => val,
    getCurrencyDisplayCode: (c: string) => c,
    getDecimalPlaces: () => 2,
    standalone_routes: { traders_hub: 'https://hub.deriv.com/dashboard/home' },
}));

jest.mock('@/utils/account-helpers', () => ({
    isDemoAccount: (loginid: string) => loginid.startsWith('VR'),
}));

jest.mock('@/components/shared_ui/text', () => ({
    __esModule: true,
    default: ({
        children,
        className,
        size: _size,
        weight: _weight,
        ...props
    }: {
        children: React.ReactNode;
        className?: string;
        size?: string;
        weight?: string;
    }) => (
        <span className={className} {...props}>
            {children}
        </span>
    ),
}));

jest.mock('../account-info-wrapper', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockActiveAccount = {
    loginid: 'CR123',
    currency: 'USD',
    balance: '100.00',
    isVirtual: false,
    is_virtual: 0,
    isActive: true,
    currencyLabel: 'USD',
    icon: <span />,
};

const mockDemoAccount = {
    ...mockActiveAccount,
    loginid: 'VRTC456',
    isVirtual: true,
    is_virtual: 1,
    balance: '9992.15',
};

describe('AccountSwitcher', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset module mocks to defaults
        const { useApiBase } = require('@/hooks/useApiBase');
        useApiBase.mockReturnValue({ accountList: mockAccountList, activeLoginid: 'CR123' });
        const { useStore } = require('@/hooks/useStore');
        useStore.mockReturnValue({
            client: {
                checkAndRegenerateWebSocket: mockCheckAndRegenerateWebSocket,
                regenerateWebSocket: mockRegenerateWebSocket,
            },
            run_panel: { is_running: false },
        });
        require('@/external/bot-skeleton/services/api/api-base').api_base.is_running = false;
    });

    it('returns null when activeAccount is not provided', () => {
        const { container } = render(<AccountSwitcher activeAccount={undefined} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the account mark and balance in the header trigger', () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        expect(screen.getByTestId('dt_acc_balance')).toHaveTextContent('100.00 USD');
        expect(screen.getByTestId('dt_acc_trigger_mark')).toBeInTheDocument();
        expect(screen.getByTestId('dt_acc_info').textContent).toContain('🇺🇸');
        expect(screen.queryByTestId('dt_acc_mark')).not.toBeInTheDocument();
    });

    it('shows demo balance in the header when the active account is demo', () => {
        render(<AccountSwitcher activeAccount={mockDemoAccount} />);
        expect(screen.getByTestId('dt_acc_balance')).toHaveTextContent('9992.15 USD');
    });

    it('opens dropdown on click', () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens on the tab matching the active account and filters accounts', () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByRole('tab', { name: 'Real' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('CR123')).toBeInTheDocument();
        expect(screen.queryByText('VRTC456')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'Demo' }));
        expect(screen.getByText('VRTC456')).toBeInTheDocument();
        expect(screen.queryByText('CR123')).not.toBeInTheDocument();
    });

    it('collapses and expands the Deriv account group', () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        const group = screen.getByRole('button', { name: /Deriv account/ });
        fireEvent.click(group);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        fireEvent.click(group);
        expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown while the bot runs but blocks switching', () => {
        const { useStore } = require('@/hooks/useStore');
        useStore.mockReturnValue({
            client: {
                checkAndRegenerateWebSocket: mockCheckAndRegenerateWebSocket,
                regenerateWebSocket: mockRegenerateWebSocket,
            },
            run_panel: { is_running: true },
        });
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Stop the bot to switch accounts.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'Demo' }));
        fireEvent.click(screen.getByRole('option', { name: /VRTC456/ }));
        expect(mockRegenerateWebSocket).not.toHaveBeenCalled();
        expect(mockCheckAndRegenerateWebSocket).not.toHaveBeenCalled();
    });

    it('opens dropdown with a single account', () => {
        const { useApiBase } = require('@/hooks/useApiBase');
        useApiBase.mockReturnValue({
            accountList: [{ loginid: 'CR123', currency: 'USD', balance: 100, is_virtual: 0 }],
            activeLoginid: 'CR123',
        });
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes dropdown on outside click', () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes dropdown on Escape key', () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('sets localStorage and regenerates the socket on account select', () => {
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        fireEvent.click(screen.getByRole('tab', { name: 'Demo' }));
        fireEvent.click(screen.getByRole('option', { name: /VRTC456/ }));
        expect(setItemSpy).toHaveBeenCalledWith('active_loginid', 'VRTC456');
        expect(setItemSpy).toHaveBeenCalledWith('account_type', 'demo');
        expect(mockRegenerateWebSocket).toHaveBeenCalledTimes(1);
        expect(mockCheckAndRegenerateWebSocket).not.toHaveBeenCalled();
        setItemSpy.mockRestore();
    });

    it('does not regenerate the socket when clicking the already-active account', () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        fireEvent.click(screen.getByRole('option', { name: /CR123/ }));
        expect(mockRegenerateWebSocket).not.toHaveBeenCalled();
        expect(mockCheckAndRegenerateWebSocket).not.toHaveBeenCalled();
    });

    it('does not regenerate the socket for the localhost preview account', () => {
        const { useApiBase } = require('@/hooks/useApiBase');
        useApiBase.mockReturnValue({ accountList: [], activeLoginid: 'CR999' });
        render(<AccountSwitcher activeAccount={DESIGN_PREVIEW_ACCOUNT} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        fireEvent.click(screen.getByRole('tab', { name: 'Demo' }));
        fireEvent.click(screen.getByText('DOT93804017'));
        expect(mockRegenerateWebSocket).not.toHaveBeenCalled();
        expect(mockCheckAndRegenerateWebSocket).not.toHaveBeenCalled();
        expect(localStorage.getItem('active_loginid')).not.toBe('DOT93804017');
    });

    it('shows the account mark and loginid in the dropdown card', () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByText('CR123')).toBeInTheDocument();
        expect(screen.getAllByTestId('dt_acc_trigger_mark').length).toBeGreaterThan(0);
    });

    it('tops up the demo balance from Reset balance', async () => {
        const { useApiBase } = require('@/hooks/useApiBase');
        useApiBase.mockReturnValue({ accountList: mockAccountList, activeLoginid: 'VRTC456' });
        render(<AccountSwitcher activeAccount={mockDemoAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        fireEvent.click(screen.getByRole('button', { name: 'Reset balance' }));
        expect(mockSend).toHaveBeenCalledWith({ topup_virtual: 1 });
        await waitFor(() => expect(screen.getByText('Balance reset.')).toBeInTheDocument());
    });

    it("links to Trader's Hub and logs out", () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        fireEvent.click(screen.getByTestId('dt_acc_info'));
        expect(screen.getByRole('link', { name: /Trader's Hub/ })).toHaveAttribute(
            'href',
            'https://hub.deriv.com/dashboard/home'
        );
        fireEvent.click(screen.getByRole('button', { name: /Logout/ }));
        expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('trigger has correct ARIA attributes', () => {
        render(<AccountSwitcher activeAccount={mockActiveAccount} />);
        const trigger = screen.getByTestId('dt_acc_info');
        expect(trigger).toHaveAttribute('role', 'button');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        fireEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
});
