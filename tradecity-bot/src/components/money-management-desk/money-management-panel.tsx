import { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import EntryScanner from '@/components/entry-scanner/entry-scanner';
import { useStore } from '@/hooks/useStore';
import MoneyManagementDesk from './money-management-desk';

/** Supplies the account currency and sign-in state the plan persists against. */
const MoneyManagementPanel = observer(() => {
    const { client } = useStore();
    const currency = client?.currency || 'USD';
    const formatLocal = useCallback((value: number) => `${value.toFixed(2)} ${currency}`, [currency]);

    return (
        <>
            <MoneyManagementDesk signedIn={Boolean(client?.is_logged_in)} formatLocal={formatLocal} />
            <EntryScanner />
        </>
    );
});

export default MoneyManagementPanel;
