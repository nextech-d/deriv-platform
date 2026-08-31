import { getFormattedText } from '@/components/shared';
import DBotStore from '../../../scratch/dbot-store';

export default Engine =>
    class Balance extends Engine {
        // The balance is owned entirely by the client store (ClientStore), which is
        // fed by the single WS `balance` listener in CoreStoreProvider and refreshed
        // at settlement. The engine no longer keeps its own balance subscription:
        // reading a flat `data.balance.balance` off `account:'all'` delta ticks (which
        // are keyed under `balance.accounts[loginid]`) left the engine value frozen
        // after the first snapshot. getBalance() now reads that one source of truth.
        observeBalance() {}

        getBalance(type) {
            const { client } = DBotStore.instance;
            const balance = (client && client.balance) || 0;

            return type === 'STR' ? getFormattedText(balance, client?.currency, false) : Number(balance) || 0;
        }
    };
