import { act, renderHook } from '@testing-library/react';
import {
    account_list$,
    authData$,
    notifyActiveLoginidChange,
} from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { useApiBase } from '../useApiBase';

/**
 * Regression cover for the terminal account-switch spinner.
 *
 * regenerateWebSocket (client-store.ts) clears accountList to [] and calls
 * setAuthData(null), but deliberately leaves active_loginid in localStorage. If
 * activeLoginid stays truthy through that, header.tsx matches neither its
 * signed-in branch (:143 needs activeLoginid && activeAccount) nor its
 * signed-out branch (:157 needs !activeLoginid), so the spinner is terminal.
 */

const AUTH = (loginid: string) =>
    ({
        loginid,
        account_list: [{ loginid, currency: 'USD' }],
    }) as unknown as Parameters<typeof authData$.next>[0];

/** Put the shared BehaviorSubjects back to a known state; they are module-level. */
const resetStreams = () => {
    act(() => {
        authData$.next(null);
        account_list$.next([]);
        notifyActiveLoginidChange('');
    });
};

describe('useApiBase activeLoginid', () => {
    beforeEach(() => {
        localStorage.clear();
        resetStreams();
    });

    afterAll(() => resetStreams());

    it('keeps localStorage precedence while a session is live', () => {
        // The switcher writes the new id before the socket catches up; balance ticks
        // must follow the selection rather than the socket's older identity.
        localStorage.setItem('active_loginid', 'CR900001');
        const { result } = renderHook(() => useApiBase());

        act(() => {
            authData$.next(AUTH('VRTC500001'));
        });

        expect(result.current.activeLoginid).toBe('CR900001');
    });

    it('falls back to the authorized loginid when localStorage has none', () => {
        const { result } = renderHook(() => useApiBase());

        act(() => {
            authData$.next(AUTH('VRTC500001'));
        });

        expect(result.current.activeLoginid).toBe('VRTC500001');
    });

    it('clears activeLoginid when authData is explicitly cleared', () => {
        localStorage.setItem('active_loginid', 'CR900001');
        const { result } = renderHook(() => useApiBase());

        act(() => {
            authData$.next(AUTH('CR900001'));
        });
        expect(result.current.activeLoginid).toBe('CR900001');

        act(() => {
            authData$.next(null);
        });

        // active_loginid is still in localStorage — regenerateWebSocket leaves it.
        expect(localStorage.getItem('active_loginid')).toBe('CR900001');
        expect(result.current.activeLoginid).toBe('');
    });

    it('leaves a failed switch recoverable rather than in a terminal spinner', () => {
        // Start signed in on demo.
        localStorage.setItem('active_loginid', 'VRTC500001');
        const { result } = renderHook(() => useApiBase());
        act(() => {
            authData$.next(AUTH('VRTC500001'));
            account_list$.next([{ loginid: 'VRTC500001', currency: 'USD' }] as never);
        });

        // User picks a real account: the switcher writes localStorage, then
        // regenerateWebSocket empties the list and drops the auth data.
        act(() => {
            localStorage.setItem('active_loginid', 'CR900001');
            notifyActiveLoginidChange('CR900001');
        });
        act(() => {
            account_list$.next([]);
            authData$.next(null);
        });

        // Authorize never lands. header.tsx:157 needs !activeLoginid to offer Log in;
        // if this is truthy with an empty list, the spinner never clears.
        expect(result.current.accountList).toEqual([]);
        expect(result.current.activeLoginid).toBe('');
    });

    it('does not resurrect the stale id when the consumer remounts mid-switch', () => {
        localStorage.setItem('active_loginid', 'CR900001');
        const first = renderHook(() => useApiBase());

        act(() => {
            notifyActiveLoginidChange('CR900001');
        });
        act(() => {
            authData$.next(null);
        });
        expect(first.result.current.activeLoginid).toBe('');
        first.unmount();

        // activeLoginid$ is a BehaviorSubject: a fresh subscriber replays its last
        // value on mount, so the clear has to reset the subject, not just the state.
        const second = renderHook(() => useApiBase());
        expect(second.result.current.activeLoginid).toBe('');
    });

    it('recovers once a new authorize lands after a failed switch', () => {
        localStorage.setItem('active_loginid', 'CR900001');
        const { result } = renderHook(() => useApiBase());

        act(() => {
            authData$.next(null);
        });
        expect(result.current.activeLoginid).toBe('');

        act(() => {
            account_list$.next([{ loginid: 'CR900001', currency: 'USD' }] as never);
            authData$.next(AUTH('CR900001'));
        });

        expect(result.current.activeLoginid).toBe('CR900001');
        expect(result.current.accountList).toEqual([{ loginid: 'CR900001', currency: 'USD' }]);
    });
});
