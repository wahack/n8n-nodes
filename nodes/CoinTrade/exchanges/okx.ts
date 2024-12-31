import axios from 'axios';
import axiosRetry from 'axios-retry';
import crypto from 'crypto';
import { get, isEmpty } from 'radash';
import qs from 'qs';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, Order, OrderBook, OHLCV, MarketType } from './types';
import getAgent  from './agent';
import muder from './helpers/muder';
import { ExchangeError, NetworkRequestError } from './helpers/error';
import BigNumber from 'bignumber.js';

/**
 * Netherland users: use https://api.bybit.nl for mainnet
 * Hong Kong users: use https://api.byhkbit.com for mainnet
 * Turkey users: use https://api.bybit-tr.com for mainnet
 * Bybit cannot promise the stability and performance if you are still using api.bybit.com, and this domain has the possibility to be shutdown at any time for users from these countries/areas.
 */
const BASE_URL = 'https://www.okx.com';
const TIMEOUT = 10000;
// 创建全局可用的axios实例
const requestInstance =  axios.create({
	baseURL: BASE_URL,
	timeout: TIMEOUT,
	headers: {
		'Content-Type': 'application/json',
	}
});

requestInstance.interceptors.response.use(response => {

	if (response.data.code != 0) {
		throw new ExchangeError(get(response, 'data.data[0].sMsg', response.data.msg));
	}
	return response;
}, error => {
	throw new NetworkRequestError(get(error, 'response.data.msg', error.message));
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


export default class Okx extends BaseExchange {
	name = 'Okx';
	/** ---- Helper functions ---- */
	static checkRequiredCredentials(apiKeys: ApiKeys): boolean {
		if(!apiKeys || !apiKeys.apiKey || !apiKeys.secret || !apiKeys.password) {
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
	static generateSignature(apiKeys: ApiKeys,url: string, method: string, timestamp: string, params: any, data: any) {
		let endpoint = url.startsWith('http') ? ('/' + url.replace(/.*\.com\/(.*)/, '$1')) : url;
		const query = qs.stringify(params, { encode: false })

		const str = timestamp + method.toUpperCase() + endpoint + (query ? (endpoint.includes('?')?'&':'?')+ query : "") + (!isEmpty(data) ? JSON.stringify(data) : "");

		return crypto.createHmac('sha256', apiKeys.secret).update(str).digest('base64');
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
			remaining: (data: any) => !isEmpty(data.leavesQty) ? +data.leavesQty : new BigNumber(data.qty).minus(data.cumExecQty).toNumber()
		})
	}

	static sign(apiKeys: ApiKeys, url: string, method: string, params: any, data?: any, headers?: any) {
		this.checkRequiredCredentials(apiKeys);
		const timestamp = new Date().toISOString()
		const signature = Okx.generateSignature(apiKeys, url, method, timestamp, params, data);
		headers = headers || {};
		headers['OK-ACCESS-KEY'] = apiKeys.apiKey;
		headers['OK-ACCESS-TIMESTAMP'] = timestamp;
		headers['OK-ACCESS-SIGN'] = signature;
		headers['OK-ACCESS-PASSPHRASE'] = apiKeys.password;
		headers['Content-Type'] = 'application/json'
		// headers['x-simulated-trading'] = 1
		// console.log(url, method, data, headers, params);
		return  { url, method, data, headers, params };
	}

	static getMarket(symbolInput: string): Market {
		const market = BaseExchange.getMarket(symbolInput);
		market.symbol = market.symbol.split('/').join('-');
		return market;
	}

	static getInstType (symbolInput: string): string {
		const market = this.getMarket(symbolInput);
		if (market.marketType === MarketType.spot) return 'SPOT';
		if (market.marketType === MarketType.linear) return 'SWAP';
		if (market.marketType === MarketType.option) return 'OPTION';
		return 'FUTURES'
	}
	static getInstId (symbolInput: string): string {
		const market = this.getMarket(symbolInput);
		if (market.marketType === MarketType.spot) return market.symbol;
		if (market.marketType === MarketType.linear) return market.symbol + '-SWAP';
		// if (market.marketType === MarketType.option) return 'OPTION';
		// return 'FUTURES'
		// todo: futrues \ options
		return '' //market.symbol
	}

	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
    const response = await requestInstance.get('/api/v5/market/ticker', {
      params: {
        instId: this.getInstId(symbol)
      },
			httpsAgent: getAgent(socksProxy),
			httpAgent: getAgent(socksProxy)
    });

		return {
			...muder<Ticker>(response.data.data[0], {symbol}, {
				last: 'last|num',
				high: 'high24h|num',
				low: 'low24h|num',
				vol: 'vol24h|num',
				bid: 'bidPx|num',
				ask: 'askPx|num'
			})
		}
	}

	static async fetchOrderBook(socksProxy: string, symbol: string, limit: number): Promise<OrderBook> {
		const response = await requestInstance.get('/api/v5/market/books', {
			params: {
				instId: this.getInstId(symbol),
				sz: limit
			},
			httpsAgent: getAgent(socksProxy)
		});
		const data = response.data.data[0]
		return {
			symbol: symbol,
			timestamp: data.ts,
			asks: data.asks.map((item: any) => [+item[0], +item[1]]),
			bids: data.bids.map((item: any) => [+item[0], +item[1]])
		}
	}

	static async fetchOHLCV (socksProxy: string, symbol: string, timeframe = '1m', since: number, limit: number, params = {}): Promise<OHLCV[]> {
		const response = await requestInstance.get('/api/v5/market/candles', {
			params: {
				instId: this.getInstId(symbol),
				bar: timeframe,
				limit
			},
			httpsAgent: getAgent(socksProxy)
		});
		return response.data.data.map((item: any) => [+item[0], +item[1], +item[2], +item[3], +item[4], +item[5]])
	}


	/** ---- Private API ---- */
	static async fetchBalance(socksProxy: string, apiKeys: ApiKeys, coin?: string): Promise<any> {
		const { url, method, data, headers, params } = this.sign(apiKeys, '/api/v5/asset/balances', 'GET', {ccy: coin});
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});

		return {
			info: response.data.data
		}
	}

	// static async fetchOrder(socksProxy: string, apiKeys: ApiKeys, orderId: string, symbol: string, paramsExtra: any): Promise<Order> {
	// 	const market = this.getMarket(symbol);
	// 	const { url, method, data, headers, params } = this.sign(apiKeys, '/api/v5/order/realtime', 'GET', {category: market.marketType, symbol: market.symbol, orderId});
	// 	const response = await requestInstance(url, {
	// 		method,
	// 		data,
	// 		headers,
	// 		params,
	// 		httpsAgent: getAgent(socksProxy)
	// 	});
	// 	return this.parseOrder(response.data.result.list[0], symbol)
	// }

	// static async fetchOpenOrders(socksProxy: string, apiKeys: ApiKeys, symbol: string, since: number | undefined, limit: number, paramsExtra?: any): Promise<Order[]> {
	// 	const market = this.getMarket(symbol);
	// 	const { url, method, data, headers, params } = this.sign(apiKeys, '/v5/order/realtime', 'GET', {category: market.marketType, symbol: market.symbol, limit});
	// 	const response = await requestInstance(url, {
	// 		method,
	// 		data,
	// 		headers,
	// 		params,
	// 		httpsAgent: getAgent(socksProxy)
	// 	});
	// 	return response.data.result.list.map((order: any) => this.parseOrder(order, symbol))
	// }

	// static async fetchClosedOrders(socksProxy: string, apiKeys: ApiKeys, symbol: string, since: number | undefined, limit: number, paramsExtra?: any): Promise<Order[]> {
	// 	const market = this.getMarket(symbol);
	// 	const { url, method, data, headers, params } = this.sign(apiKeys, '/v5/order/history', 'GET', {category: market.marketType, symbol: market.symbol, limit});
	// 	const response = await requestInstance(url, {
	// 		method,
	// 		data,
	// 		headers,
	// 		params,
	// 		httpsAgent: getAgent(socksProxy)
	// 	});
	// 	return response.data.result.list.map((order: any) => this.parseOrder(order, symbol))
	// }

	// static async cancelOrder(socksProxy: string, apiKeys: ApiKeys, orderId: string, symbol: string) {
	// 	const market = this.getMarket(symbol);
	// 	const { url, method, data, headers, params } = this.sign(apiKeys, '/v5/order/cancel', 'POST',undefined, {category: market.marketType, symbol: market.symbol, orderId});
	// 	const response = await requestInstance(url, {
	// 		method,
	// 		data,
	// 		headers,
	// 		params,
	// 		httpsAgent: getAgent(socksProxy)
	// 	});
	// 	return muder(response.data.result, {info: response.data.result, symbol}, {
	// 		id: 'orderId',
	// 		clientOrderId: 'orderLinkId'
	// 	});
	// }

	static async createOrder(socksProxy: string, apiKeys: ApiKeys, symbol: string, type: string, side: string, amount: number, price: number, paramsExtra?: any): Promise<any> {
		const market = this.getMarket(symbol);
		const body = {
			instId: this.getInstId(symbol),
			tdMode: market.marketType === MarketType.spot ? 'cash' : 'cross',
			side,
			ordType: type,
			sz: amount,
			...paramsExtra
		}
		if (type === 'market' && market.marketType === MarketType.spot) {
			body.tgtCcy = 'base_ccy'
		}
		if (price) body.px = price
		const { url, method, data, headers, params } = this.sign(apiKeys, '/api/v5/trade/order', 'POST', undefined, body);
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		const ret = response.data.data[0]
		return{info: ret, symbol,
			id: ret.ordId,
			clientOrderId: ret.clOrdId
		};
	}
 /** --- custom api request ---- */
	static async customRequest(socksProxy: string, apiKeys: ApiKeys | undefined, url: string, method: string, data: any, paramsExtra?: any) {
		const keys = apiKeys || paramsExtra?.apiKeys
		if (keys) {
			return (await requestInstance(url, {
				...this.sign(keys, url, method.toUpperCase(), method === 'get'? data: undefined, method !== 'get'? data: undefined),
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

// 	}
// 	// console.log(await Okx.fetchTicker('socks://127.0.0.1:7890', 'BTC/USDT:USDT'));
// 	// console.log(await Okx.fetchBalance('socks://127.0.0.1:7890', apiKeys));
// 	// console.log(await Bybit.fetchClosedOrders('', apiKeys, 'BTC/USDT:USDT',undefined,20));
// 	console.log(await Okx.createOrder('socks://127.0.0.1:7890', apiKeys, 'BTC/USDT', 'market', 'sell', 0.01, 0));
// 	// console.log(await Bybit.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
// 	// console.log(await Okx.fetchOrderBook('socks://127.0.0.1:7890', 'BTC/USDT:USDT', 10));
// 	// console.log(await Bybit.fetchOrder('', apiKeys, '2a733272-5240-4e92-92e1-5daa2d5bc82c', 'BTC/USDT:USDT', {}));
// }

// test();
