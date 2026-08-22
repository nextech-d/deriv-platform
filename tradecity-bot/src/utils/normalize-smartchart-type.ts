/** SmartCharts chart type ids — map our stored values to champion enums. */
export function normalizeSmartChartType(type: string | undefined): string {
    switch ((type ?? 'line').toLowerCase()) {
        case 'candle':
        case 'candles':
            return 'candles';
        case 'mountain':
        case 'area':
        case 'line':
            return 'line';
        case 'ohlc':
        case 'colored_bar':
            return 'ohlc';
        case 'hollow':
        case 'hollow_candle':
            return 'hollow';
        default:
            return type ?? 'line';
    }
}
