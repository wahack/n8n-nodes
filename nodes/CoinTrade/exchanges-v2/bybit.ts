import axios from 'axios';
import axiosRetry from 'axios-retry';
import crypto from 'crypto';
import { isEmpty, pick } from 'radash';
import qs from 'qs';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, Order, OrderBook } from './types';
import getAgent  from './agent';
import muder from './helpers/muder';
import { ExchangeError, NetworkRequestError } from './helpers/error';

/**
 * Netherland users: use https://api.bybit.nl for mainnet
 * Hong Kong users: use https://api.byhkbit.com for mainnet
 * Turkey users: use https://api.bybit-tr.com for mainnet
 * Bybit cannot promise the stability and performance if you are still using api.bybit.com, and this domain has the possibility to be shutdown at any time for users from these countries/areas.
 */
const BASE_URL = 'https://api.bybit.com';
const TIMEOUT = 10000;
// 创建全局可用的axios实例
const requestInstance =  axios.create({
	baseURL: BASE_URL,
	timeout: TIMEOUT,
	headers: {
		'Content-Type': 'application/json',
		'X-BAPI-RECV-WINDOW': TIMEOUT.toString()
	}
});

requestInstance.interceptors.response.use(response => {
	if (response.data.retCode !== 0) {
		throw new ExchangeError(response.data.retMsg);
	}
	return response;
}, error => {
	throw new NetworkRequestError(error.message);
});

axiosRetry(requestInstance, {
	retries: 3,
	retryDelay: axiosRetry.linearDelay(),
	retryCondition: (error) => {
		// 429: too many requests
		// 500: internal server error
		// NETWORK_ERROR
		// console.log('============');

		return error.response?.status !== 429  || error.code === 'ECONNREFUSED';
	}
});

// function 首字母大写
function capitalize(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}


export default class Bybit extends BaseExchange {
	name = 'Bybit';
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
	static generateSignature(apiKeys: ApiKeys, timestamp: string, params: any, data: any) {
		const str = timestamp + apiKeys.apiKey + TIMEOUT.toString() + (!isEmpty(params) ? qs.stringify(params, { encode: false }) : "") + (!isEmpty(data) ? JSON.stringify(data) : "");
		return crypto.createHmac('sha256', apiKeys.secret).update(str).digest('hex');
	}

	static parseOrder(order: any, symbol: string) {
		const orderStatus: Record<string, string> = {
			New: 'open',
			PartiallyFilled: 'open',
			Untriggered: 'open',
			Triggered: 'open',
			Rejected: 'rejected',
			PartiallyFilledCanceled : 'canceled',
			Filled: 'closed',
			Deactivated: 'closed',
			Cancelled: 'canceled'
		}
		return muder<Order>(order, {info: order, symbol: symbol}, {
			id: 'orderId',
			clientOrderId: 'orderLinkId',
			status: (data: any) => orderStatus[data.orderStatus] || data.orderStatus,
			side: 'side|toLower',
			type: 'orderType|toLower',
			price: 'price|num',
			average: 'avgPrice|num',
			amount: 'qty|num',
			filled: 'cumExecQty|num',
			remaining: 'leavesQty|num'
		})
	}

	static sign(apiKeys: ApiKeys, url: string, method: string, params: any, data?: any, headers?: any) {
		this.checkRequiredCredentials(apiKeys);
		const timestamp = Date.now().toString();
		const signature = Bybit.generateSignature(apiKeys, timestamp, params, data);
		headers = headers || {};
		headers['X-BAPI-API-KEY'] = apiKeys.apiKey;
		headers['X-BAPI-TIMESTAMP'] = timestamp;
		headers['X-BAPI-SIGN'] = signature;
		headers['X-BAPI-RECV-WINDOW'] = TIMEOUT.toString();
		// console.log(url, method, data, headers, params);
		return  { url, method, data, headers, params };
	}

	static getMarket(symbolInput: string): Market {
		const market = BaseExchange.getMarket(symbolInput);
		market.symbol = market.symbol.split('/').join('');
		return market;
	}

	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		const market = this.getMarket(symbol);
    const response = await requestInstance.get('/v5/market/tickers', {
      params: {
        category: market.marketType,
        symbol: market.symbol
      },
			httpsAgent: getAgent(socksProxy),
			httpAgent: getAgent(socksProxy)
    });
		return {
			...muder<Ticker>(response.data.result.list[0], {symbol}, {
				last: 'lastPrice|num',
				high: 'highPrice24h|num',
				low: 'lowPrice24h|num',
				vol: 'volume24h|num',
				bid: 'bid1Price|num',
				ask: 'ask1Price|num'
			})
		}
	}

	static async fetchOrderBook(socksProxy: string, symbol: string, limit: number): Promise<OrderBook> {
		const market = this.getMarket(symbol);
		const response = await requestInstance.get('/v5/market/orderbook', {
			params: {
				category: market.marketType,
				symbol: market.symbol,
				limit
			},
			httpsAgent: getAgent(socksProxy)
		});
		return {
			symbol: symbol,
			timestamp: response.data.result.ts,
			asks: response.data.result.a.map((item: any) => [+item[0], +item[1]]),
			bids: response.data.result.b.map((item: any) => [+item[0], +item[1]])
		}
	}

	/** ---- Private API ---- */
	static async fetchBalance(socksProxy: string, apiKeys: ApiKeys, coin?: string): Promise<any> {
		const { url, method, data, headers, params } = this.sign(apiKeys, '/v5/account/wallet-balance', 'GET', {accountType: 'UNIFIED', coin});
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});

		return {
			info: response.data.result.list,
			requestInfo: {
				url: requestInstance.defaults.baseURL + url,
				method,
				...pick(response.headers, ['x-bapi-limit', 'x-bapi-limit-status', 'x-bapi-limit-reset-timestamp'])
			}
		}
	}

	static async fetchOrder(socksProxy: string, apiKeys: ApiKeys, orderId: string, symbol: string, paramsExtra: any): Promise<Order> {
		const market = this.getMarket(symbol);
		const { url, method, data, headers, params } = this.sign(apiKeys, '/v5/order/realtime', 'GET', {category: market.marketType, symbol: market.symbol, orderId});
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return this.parseOrder(response.data.result, symbol)
	}

	static async fetchOpenOrders(socksProxy: string, apiKeys: ApiKeys, symbol: string, since: number | undefined, limit: number, paramsExtra?: any): Promise<Order[]> {
		const market = this.getMarket(symbol);
		const { url, method, data, headers, params } = this.sign(apiKeys, '/v5/order/realtime', 'GET', {category: market.marketType, symbol: market.symbol, limit});
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return response.data.result.list.map((order: any) => this.parseOrder(order, symbol))
	}

	static async fetchClosedOrders(socksProxy: string, apiKeys: ApiKeys, symbol: string, since: number | undefined, limit: number, paramsExtra?: any): Promise<Order[]> {
		const market = this.getMarket(symbol);
		const { url, method, data, headers, params } = this.sign(apiKeys, '/v5/order/history', 'GET', {category: market.marketType, symbol: market.symbol, limit});
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return response.data.result.list.map((order: any) => this.parseOrder(order, symbol))
	}

	static async cancelOrder(socksProxy: string, apiKeys: ApiKeys, orderId: string, symbol: string) {
		const market = this.getMarket(symbol);
		const { url, method, data, headers, params } = this.sign(apiKeys, '/v5/order/cancel', 'POST',undefined, {category: market.marketType, symbol: market.symbol, orderId});
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return muder(response.data.result, {info: response.data.result, symbol}, {
			id: 'orderId',
			clientOrderId: 'orderLinkId'
		});
	}

	static async createOrder(socksProxy: string, apiKeys: ApiKeys, symbol: string, type: string, side: string, amount: number, price: number, paramsExtra?: any): Promise<any> {
		const market = this.getMarket(symbol);
		const { url, method, data, headers, params } = this.sign(apiKeys, '/v5/order/create', 'POST', undefined, {category: market.marketType, symbol: market.symbol,  price: (price||'').toString(), side: capitalize(side),qty: amount.toString(),marketUnit: 'baseCoin', orderType: capitalize(type), ...paramsExtra});
		const response = await requestInstance(url, {
			method,
			data,
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
	static async customRequest(socksProxy: string, apiKeys: ApiKeys | undefined, url: string, method: string, data: any) {
		if (apiKeys) {
			return (await requestInstance(url, {
				...this.sign(apiKeys, url, method.toUpperCase(), method === 'get'? data: undefined, method !== 'get'? data: undefined),
				httpsAgent: getAgent(socksProxy)
			})).data;
		} else {
			return (await requestInstance(url, {
				method: method.toUpperCase(),
				params: method === 'get'? data: undefined,
				data: method !== 'get'? data: undefined,
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
// 	// console.log(await Bybit.fetchTicker('', 'BTC/USDT:USDT'));
// 	// console.log(await Bybit.fetchBalance('', apiKeys));
// 	// console.log(await Bybit.fetchClosedOrders('', apiKeys, 'BTC/USDT:USDT',undefined,20));
// 	// console.log(await Bybit.createOrder('socks://127.0.0.1:7890', apiKeys, 'BTC/USDT:USDT', 'limit', 'buy', 0.001, 63000));
// 	// console.log(await Bybit.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
// 	console.log(await Bybit.fetchOrderBook('socks://127.0.0.1:7890', 'BTC/USDT:USDT', 10));
// }

// test();
