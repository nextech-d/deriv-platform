/* eslint-disable no-confusing-arrow */
import { Map } from 'immutable';
import { analysisTickQuote, analysisTickSymbol } from '@/utils/analysis-tick';
import { getLast, historyToTicks } from '../../utils/binary-utils';
import { observer as globalObserver } from '../../utils/observer';
import { doUntilDone, getUUID } from '../tradeEngine/utils/helpers';
import { api_base } from './api-base';

const parseTick = tick => ({
    epoch: +tick.epoch,
    quote: analysisTickQuote(tick),
});

const parseOhlc = ohlc => ({
    open: +ohlc.open,
    high: +ohlc.high,
    low: +ohlc.low,
    close: +ohlc.close,
    epoch: +(ohlc.open_time || ohlc.epoch),
});

const parseCandles = candles => (Array.isArray(candles) ? candles.map(t => parseOhlc(t)) : []);

const ticksFromResponse = response => {
    if (response?.history?.times?.length) return historyToTicks(response.history);
    if (response?.tick?.epoch) return [parseTick(response.tick)];
    return [];
};

const updateTicks = (ticks, newTick) => {
    const last = getLast(ticks);
    if (!last) return [newTick];
    return last.epoch >= newTick.epoch ? ticks : [...ticks.slice(1), newTick];
};

const updateCandles = (candles, ohlc) => {
    const lastCandle = getLast(candles);
    if (!lastCandle) return [ohlc];
    if (
        (lastCandle.open === ohlc.open &&
            lastCandle.high === ohlc.high &&
            lastCandle.low === ohlc.low &&
            lastCandle.close === ohlc.close &&
            lastCandle.epoch === ohlc.epoch) ||
        lastCandle.epoch > ohlc.epoch
    ) {
        return candles;
    }
    const prevCandles = lastCandle.epoch === ohlc.epoch ? candles.slice(0, -1) : candles.slice(1);
    return [...prevCandles, ohlc];
};

const getType = isCandle => (isCandle ? 'candles' : 'ticks');

export default class TicksService {
    constructor() {
        this.ticks = new Map();
        this.candles = new Map();
        this.tickListeners = new Map();
        this.ohlcListeners = new Map();
        this.subscriptions = new Map();
        this.ticks_history_promise = null;
        this.active_symbols_promise = null;
        this.candles_promise = null;
        this.has_observer = false;

        this.observe();
    }

    requestPipSizes() {
        if (this.pipSizes) {
            return Promise.resolve(this.pipSizes);
        }

        if (!this.active_symbols_promise) {
            this.active_symbols_promise = new Promise(resolve => {
                this.pipSizes = api_base.pip_sizes;
                resolve(this.pipSizes);
            });
        }
        return this.active_symbols_promise;
    }

    async request(options) {
        return new Promise((resolve, reject) => {
            const { symbol, granularity } = options;

            const style = getType(granularity);

            if (style === 'ticks' && this.ticks.has(symbol)) {
                const cached = this.ticks.get(symbol);
                if (cached?.length) {
                    resolve(cached);
                    return;
                }
            }

            if (style === 'candles' && this.candles.hasIn([symbol, Number(granularity)])) {
                resolve(this.candles.getIn([symbol, Number(granularity)]));
            }
            this.requestStream({ ...options, style })
                .then(res => {
                    resolve(res);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    monitor(options) {
        return new Promise((resolve, reject) => {
            const { symbol, granularity, callback } = options;

            const type = getType(granularity);

            const key = getUUID();
            this.request(options)
                .then(() => {
                    if (type === 'ticks') {
                        this.tickListeners = this.tickListeners.setIn([symbol, key], callback);
                        globalObserver.emit('bot.bot_ready');
                        api_base.toggleRunButton(false);
                    } else {
                        this.ohlcListeners = this.ohlcListeners.setIn([symbol, Number(granularity), key], callback);
                    }
                    resolve(key);
                })
                .catch(e => {
                    globalObserver.emit('Error', e);
                    this.ticks_history_promise = null;
                    api_base.toggleRunButton(false);
                    reject(e);
                });
        });
    }

    async stopMonitor(options) {
        const { symbol, granularity, key } = options;
        const type = getType(granularity);

        if (type === 'ticks' && this.tickListeners.hasIn([symbol, key])) {
            this.tickListeners = this.tickListeners.deleteIn([symbol, key]);
        }

        if (type === 'candles' && this.ohlcListeners.hasIn([symbol, Number(granularity), key])) {
            this.ohlcListeners = this.ohlcListeners.deleteIn([symbol, Number(granularity), key]);
        }

        await this.unsubscribeIfEmptyListeners(options);
    }

    async unsubscribeIfEmptyListeners(options) {
        const { symbol, granularity } = options;

        let needToUnsubscribe = false;

        const tickListener = this.tickListeners.get(symbol);

        if (tickListener && !tickListener.size) {
            this.tickListeners = this.tickListeners.delete(symbol);
            this.ticks = this.ticks.delete(symbol);
            needToUnsubscribe = true;
        }

        const ohlcListener = this.ohlcListeners.getIn([symbol, Number(granularity)]);

        if (ohlcListener && !ohlcListener.size) {
            this.ohlcListeners = this.ohlcListeners.deleteIn([symbol, Number(granularity)]);
            this.candles = this.candles.deleteIn([symbol, Number(granularity)]);
            needToUnsubscribe = true;
        }

        if (needToUnsubscribe) {
            await this.unsubscribeAllAndSubscribeListeners(symbol);
        }
    }

    unsubscribeAllAndSubscribeListeners(symbol) {
        const ohlcSubscriptions = this.subscriptions.getIn(['ohlc', symbol]);

        const subscription = [...(ohlcSubscriptions ? Array.from(ohlcSubscriptions.values()) : [])];

        Promise.all(subscription.map(id => doUntilDone(() => api_base.api.forget(id))));

        this.subscriptions = new Map();
    }

    updateTicksAndCallListeners(symbol, ticks) {
        if (this.ticks.get(symbol) === ticks) {
            return;
        }
        this.ticks = this.ticks.set(symbol, ticks);

        const listeners = this.tickListeners.get(symbol);

        if (listeners) {
            listeners.forEach(callback => callback(this.ticks.get(symbol)));
        }
    }

    updateCandlesAndCallListeners(address, candles) {
        if (this.ticks.getIn(address) === candles) {
            return;
        }
        this.candles = this.candles.setIn(address, candles);

        const listeners = this.ohlcListeners.getIn(address);

        if (listeners) {
            listeners.forEach(callback => callback(this.candles.getIn(address)));
        }
    }

    observe() {
        if (this.has_observer || !api_base.api) return;
        this.has_observer = true;
        const subscription = api_base.api.onMessage().subscribe(({ data }) => {
            if (data.msg_type === 'tick') {
                const { tick } = data;
                if (!tick) return;
                const symbol = analysisTickSymbol(tick);
                const { id } = tick;
                if (symbol && this.ticks.has(symbol)) {
                    this.subscriptions = this.subscriptions.setIn(['tick', symbol], id);
                    this.updateTicksAndCallListeners(symbol, updateTicks(this.ticks.get(symbol), parseTick(tick)));
                }
            }

            if (data.msg_type === 'ohlc') {
                const { ohlc } = data;
                if (!ohlc) return;
                const symbol = analysisTickSymbol(ohlc);
                const { granularity, id } = ohlc;
                if (symbol && this.candles.hasIn([symbol, Number(granularity)])) {
                    this.subscriptions = this.subscriptions.setIn(['ohlc', symbol, Number(granularity)], id);
                    const address = [symbol, Number(granularity)];
                    this.updateCandlesAndCallListeners(
                        address,
                        updateCandles(this.candles.getIn(address), parseOhlc(ohlc))
                    );
                }
            }
        });
        api_base.pushSubscription(subscription);
    }

    requestStream(options) {
        const { style } = options;
        const stringified_options = JSON.stringify(options);

        if (style === 'ticks') {
            // Check if we already have a promise for these exact options
            if (!this.ticks_history_promise || this.ticks_history_promise.stringified_options !== stringified_options) {
                this.ticks_history_promise = {
                    promise: this.requestPipSizes().then(() => this.requestTicks(options)),
                    stringified_options,
                };
            }

            return this.ticks_history_promise.promise;
        }

        if (style === 'candles') {
            // Check if we already have a promise for these exact options
            if (!this.candles_promise || this.candles_promise.stringified_options !== stringified_options) {
                this.candles_promise = {
                    promise: this.requestPipSizes().then(() => this.requestTicks(options)),
                    stringified_options,
                };
            }

            return this.candles_promise.promise;
        }

        return [];
    }

    requestTicks(options) {
        const { symbol, granularity, style } = options;
        const history_request = {
            ticks_history: symbol === 'na' ? 'R_100' : symbol,
            end: 'latest',
            count: 1000,
            granularity: granularity ? Number(granularity) : undefined,
            style,
        };
        const request_object = { ...history_request, subscribe: 1 };

        const applyTicks = (response, resolve) => {
            if (style === 'ticks') {
                const ticks = ticksFromResponse(response);
                this.updateTicksAndCallListeners(symbol, ticks);
                resolve(ticks);
                return;
            }
            const candles = parseCandles(response?.candles);
            this.updateCandlesAndCallListeners([symbol, Number(granularity)], candles);
            resolve(candles);
        };

        const fetchHistoryOnly = () =>
            api_base.api.send(history_request).then(response => {
                if (style === 'ticks' && this.ticks.has(symbol) && this.ticks.get(symbol)?.length) {
                    return this.ticks.get(symbol);
                }
                if (style === 'ticks') {
                    const ticks = ticksFromResponse(response);
                    this.updateTicksAndCallListeners(symbol, ticks);
                    return ticks;
                }
                const candles = parseCandles(response?.candles);
                this.updateCandlesAndCallListeners([symbol, Number(granularity)], candles);
                return candles;
            });

        return new Promise((resolve, reject) => {
            if (!api_base.api) {
                reject(new Error('API connection not available for ticks'));
                return;
            }
            this.observe();
            doUntilDone(() => api_base.api.send(request_object), [], api_base)
                .then(r => {
                    applyTicks(r, resolve);
                })
                .catch(error => {
                    if (error?.error?.code === 'AlreadySubscribed' || error?.code === 'AlreadySubscribed') {
                        fetchHistoryOnly()
                            .then(resolve)
                            .catch(reject);
                        return;
                    }
                    reject(error);
                });
        });
    }

    forget = () => {
        return new Promise((resolve, reject) => {
            if (api_base?.api) {
                try {
                    api_base.api
                        .forgetAll('ticks')
                        .then(() => {
                            resolve();
                        })
                        .catch(reject);
                } catch (e) {
                    console.log('Error in forget ticks', e);
                }
            } else {
                resolve();
            }
        });
    };

    forgetCandleSubscription = () => {
        return new Promise((resolve, reject) => {
            if (api_base?.api) {
                try {
                    api_base.api
                        .forgetAll('candles')
                        .then(() => {
                            resolve();
                        })
                        .catch(reject);
                } catch (e) {
                    console.log('Error in forget candles', e);
                }
            } else {
                resolve();
            }
        });
    };

    unsubscribeFromTicksService() {
        return new Promise((resolve, reject) => {
            this.forget()
                .then(() => {
                    try {
                        this.forgetCandleSubscription()
                            .then(() => {
                                resolve();
                            })
                            .catch(reject);
                    } catch (e) {
                        console.log('Error in unsubscribeFromTicksService', e);
                    }
                })
                .catch(reject);
            this.ticks_history_promise = null;
        });
    }
}
