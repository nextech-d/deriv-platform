import { CurrencyIcon } from "@/components/currency/currency-icon";
import { addComma, getDecimalPlaces } from "@/components/shared";
import { useApiBase } from "@/hooks/useApiBase";
import { useStore } from "@/hooks/useStore";
import { isVirtualAccount } from "@/utils/account-helpers";
import { resolveAccountBalance } from "@/utils/live-balance";
import { Balance } from "@deriv/api-types";

export const useActiveAccount = ({
    allBalanceData,
    directBalance,
}: {
    allBalanceData: Balance  | null;
    directBalance?: string;
}) => {
    const { accountList, activeLoginid } = useApiBase();
    const { client } = useStore() ?? {};
    
    // No useObserver needed - parent observer handles tracking
    const liveMap = client?.all_accounts_balance ?? allBalanceData;
    const liveDirect = client?.balance ?? directBalance;
    void client?.balance_version;

    const activeAccount = accountList?.find(account => account.loginid === activeLoginid);
   
    if (!activeAccount) {
        return { data: undefined };
    }

    const isVirtual = isVirtualAccount(activeAccount.loginid);
    const currentBalanceData = liveMap?.accounts?.[activeAccount.loginid ?? ''];
    const amount = resolveAccountBalance(currentBalanceData?.balance, liveDirect);
    const decimals = getDecimalPlaces(currentBalanceData?.currency ?? activeAccount.currency);

    return {
        data: {
            ...activeAccount,
            balance: addComma(amount.toFixed(decimals)),
            currencyLabel: isVirtual ? 'Demo' : activeAccount?.currency,
            icon: <CurrencyIcon currency={activeAccount?.currency?.toLowerCase()} isVirtual={isVirtual} />,
            isVirtual,
            isActive: activeAccount?.loginid === activeLoginid,
        },
    };
};