import axios from 'axios';
import axiosRetry from 'axios-retry';
import crypto from 'crypto';
import { pick } from 'radash';
import qs from 'qs';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, Order, OrderBook, OHLCV } from './types';
import getAgent  from './agent';
import muder from './helpers/muder';
import { ExchangeError } from './helpers/error';
import { get } from 'lodash';
import BigNumber from 'bignumber.js';

const UNIFIED_URL = 'https://papi.binance.com';
const SPOT_URL = 'https://api.binance.com';
const LINEAR_URL = 'https://fapi.binance.com';

const TIMEOUT = 10000;
// 创建全局可用的axios实例
const requestInstance =  axios.create({
	timeout: TIMEOUT,
	headers: {
		'Content-Type': 'application/json',
	}
});

requestInstance.interceptors.response.use(response => {
	return response;
}, error => {
	throw new ExchangeError('binance error:' + get(error, 'response.data.msg', error.message));
});

axiosRetry(requestInstance, {
	retries: 3,
	retryDelay: axiosRetry.linearDelay(),
	retryCondition: (error) => {
		return error.response?.status !== 429  || error.code === 'ECONNREFUSED';
	}
});


export default class Binance extends BaseExchange {
	name = 'Binance';
	/** ---- Helper functions ---- */
	static checkRequiredCredentials(apiKeys: ApiKeys): boolean {
		if(!apiKeys || !apiKeys.apiKey || !apiKeys.secret) {
			throw new ExchangeError(this.name + ': apiKey and secret are required');
		}
		return true;
	}
	/**
	 *
	 * @description
	 * 1、timestamp + API key + (recv_window) + (queryString | jsonBodyString)
	 * 2、Use the HMAC_SHA256 or RSA_SHA256 algorithm to sign the string in step 1, and convert it to a hex string (HMAC_SHA256) / base64 (RSA_SHA256) to obtain the sign parameter
	 */
	static generateSignature(apiKeys: ApiKeys,  params: any) {
		return crypto.createHmac('sha256', apiKeys.secret).update(qs.stringify(params, { encode: false })).digest('hex');
	}

	static parseOrder(order: any, symbol: string) {
		const orderStatus: Record<string, string> = {
			NEW: 'open',
			PARTIALLY_FILLED: 'open',
			TRIGGERED : 'open',
			FILLED  : 'closed',
			Rejected: 'rejected',
			PartiallyFilledCanceled: 'canceled',
			EXPIRED : 'expired',
			REJECTED: 'rejected',
			CANCELED: 'canceled'
		}
		return muder<Order>(order, {info: order, symbol: symbol}, {
			id: 'orderId|toString',
			clientOrderId: 'clientOrderId',
			status: (data: any) => orderStatus[data.status] || data.status,
			side: 'side|toLower',
			type: 'type|toLower',
			price: 'price|num',
			average: 'avgPrice|num',
			amount: 'origQty|num',
			filled: 'executedQty|num',
			remaining: (ret: any) => new BigNumber(ret.origQty).minus(ret.executedQty).toNumber(),
			info: (ret: any) => ret
		})
	}

	static sign(apiKeys: ApiKeys, url: string, method: string, params?: any, headers?: any) {
		this.checkRequiredCredentials(apiKeys);
		const timestamp = Date.now().toString();
		params.timestamp = timestamp;
		params.recvWindow = TIMEOUT;
		params.signature = this.generateSignature(apiKeys, params);
		headers = headers || {};
		headers['X-MBX-APIKEY'] = apiKeys.apiKey;
		return  { url, method, params, headers };
	}

	static getMarket(symbolInput: string): Market {
		const market = BaseExchange.getMarket(symbolInput);
		market.symbol = market.symbol.split('/').join('');
		return market;
	}

	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		const market = this.getMarket(symbol);
		let url = UNIFIED_URL;
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v3/ticker/price';
		} else if (market.marketType === 'linear') {
			url = LINEAR_URL + '/fapi/v2/ticker/price';
		}
    const response = await requestInstance.get(url, {
      params: {
        symbol: market.symbol
      },
			httpsAgent: getAgent(socksProxy)
    });

		return {
			symbol: symbol,
			last: +response.data.price,
			high: 0,
			low: 0,
			volume: 0,
			bid: 0,
			ask: 0
		}
	}

	static async fetchOrderBook(socksProxy: string, symbol: string, limit: number): Promise<OrderBook> {
		const market = this.getMarket(symbol);
		let url = UNIFIED_URL;
		limit = limit || 5;
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v3/depth';
		} else if (market.marketType === 'linear') {
			url = LINEAR_URL + '/fapi/v1/depth';
		}
		if (![5, 10,20,50,100, 500, 1000].includes(limit)) {
			throw new ExchangeError(this.name + ': limit must be one of 5, 10,20,50,100, 500, 1000');
		}
    const response = await requestInstance.get(url, {
      params: {
        symbol: market.symbol,
				limit
      },
			httpsAgent: getAgent(socksProxy)
    });
		return {
			symbol: symbol,
			timestamp: response.data.E || new Date().getTime(),
			asks: response.data.asks.map((item: any) => [+item[0], +item[1]]),
			bids: response.data.bids.map((item: any) => [+item[0], +item[1]])
		}
	}

	static async fetchOHLCV (socksProxy: string, symbol: string, timeframe = '1m', since: number, limit: number, params = {}): Promise<OHLCV[]> {
		const market = this.getMarket(symbol);
		let url = UNIFIED_URL;
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v3/klines';
		} else if (market.marketType === 'linear') {
			url = LINEAR_URL + '/fapi/v1/klines';
		}

		const response = await requestInstance.get(url, {
			params: {
				symbol: market.symbol,
				interval: timeframe,
				limit
			},
			httpsAgent: getAgent(socksProxy)
		});
		return response.data.map((item: any) => [+item[0], +item[1], +item[2], +item[3], +item[4], +item[5]])
	}

	/** ---- Private API ---- */
	static async fetchBalance(socksProxy: string, apiKeys: ApiKeys, coin?: string): Promise<any> {
		const url = UNIFIED_URL + '/papi/v1/balance';
		const { method, params, headers } = this.sign(apiKeys, url, 'GET', {asset:coin});
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		// console.log(response.headers);

		return {
			info: response.data.result,
			requestInfo: {
				url,
				method,
				...pick(response.headers, ['x-bapi-limit', 'x-bapi-limit-status', 'x-bapi-limit-reset-timestamp'])
			}
		}
	}

	static async fetchOrder(socksProxy: string, apiKeys: ApiKeys, orderId: string, symbol: string, paramsExtra: any): Promise<Order> {
		const market = this.getMarket(symbol);
		let url = UNIFIED_URL + '/papi/v1/um/order';
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v3/order';
		}
		const { method, headers, params } = this.sign(apiKeys, url, 'GET', {symbol: market.symbol, orderId});
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return this.parseOrder(response.data, symbol)
	}

	static async fetchOpenOrders(socksProxy: string, apiKeys: ApiKeys, symbol: string, since: number | undefined, limit: number, paramsExtra?: any): Promise<Order[]> {
		const market = this.getMarket(symbol);
		let url = UNIFIED_URL + '/papi/v1/um/openOrders';
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v3/openOrders';
		}
		const { method, headers, params } = this.sign(apiKeys, url, 'GET', {symbol: market.symbol});
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return response.data.map((order: any) => this.parseOrder(order, symbol))
	}

	static async fetchClosedOrders(socksProxy: string, apiKeys: ApiKeys, symbol: string, since: number | undefined, limit: number, paramsExtra?: any): Promise<Order[]> {
		const market = this.getMarket(symbol);
		let url = UNIFIED_URL + '/papi/v1/um/allOrders';
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v3/allOrders'
		}
		const { method, headers, params } = this.sign(apiKeys, url, 'GET', { symbol: market.symbol, limit});
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return response.data.map((order: any) => this.parseOrder(order, symbol))
	}

	static async cancelOrder(socksProxy: string, apiKeys: ApiKeys, orderId: string, symbol: string) {
		const market = this.getMarket(symbol);
		let url = UNIFIED_URL + '/papi/v1/um/order';
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v3/order';
		}
		const { method, headers, params } = this.sign(apiKeys, url, 'DELETE', { symbol: market.symbol, orderId});
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return muder(response.data, {info: response.data, symbol}, {
			id: 'orderId',
			clientOrderId: 'clientOrderId'
		});
	}

	static async createOrder(socksProxy: string, apiKeys: ApiKeys, symbol: string, type: string, side: string, amount: number, price: number, paramsExtra?: any): Promise<any> {
		const market = this.getMarket(symbol);
		let url = UNIFIED_URL + '/papi/v1/um/order';
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v3/order';
		}
		const { method, params, headers } = this.sign(apiKeys, url, 'POST', {symbol: market.symbol,  price, side: side.toUpperCase(),quantity: amount,type: type.toUpperCase(), ...paramsExtra});
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return muder(response.data.result, {info: response.data.result, symbol}, {
			id: 'orderId',
			clientOrderId: 'orderLinkId'
		});
	}
 /** --- custom api request ---- */
	static async customRequest(socksProxy: string, apiKeys: ApiKeys | undefined, url: string, method: string, params: any) {
		if (apiKeys) {
			return (await requestInstance(url, {
				...this.sign(apiKeys, url, method.toUpperCase(), params = {}),
				httpsAgent: getAgent(socksProxy)
			})).data;
		} else {
			return (await requestInstance(url, {
				method: method.toUpperCase(),
				params,
				httpsAgent: getAgent(socksProxy)
			})).data;
		}
	}

}


// async function test() {
// 	const apiKeys = {
// 		apiKey: '',
// 		secret: ''
// 	}
	// console.log(await Binance.fetchTicker('socks://127.0.0.1:7890', 'BTC/USDT'));
// 	// console.log(await Bybit.fetchBalance('', apiKeys));
// 	// console.log(await Bybit.fetchClosedOrders('', apiKeys, 'BTC/USDT:USDT',undefined,20));
// 	// console.log(await Bybit.createOrder('socks://127.0.0.1:7890', apiKeys, 'BTC/USDT:USDT', 'limit', 'buy', 0.001, 63000));
// 	// console.log(await Bybit.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
	// console.log(await Binance.fetchOrderBook('socks://127.0.0.1:7890', 'BTC/USDT', 10));
// }

// test();
