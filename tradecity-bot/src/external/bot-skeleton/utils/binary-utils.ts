import { TickSpotData } from '@deriv/api-types';

export const getLast = (arr: any[]): any => arr && (arr.length === 0 ? undefined : arr[arr.length - 1]);

export const historyToTicks = (history: any): TickSpotData[] => {
    if (!history?.times?.length || !history?.prices?.length) return [];
    return history.times.map((t: number | string, idx: number) => ({
        epoch: +t,
        quote: +history.prices[idx],
    }));
};
