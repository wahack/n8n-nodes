import axios from 'axios';
import axiosRetry from 'axios-retry';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, OrderBook } from './types';
import getAgent from './agent';
import { ExchangeError } from './helpers/error';
import { get, omit } from 'radash';
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import qs from 'qs';


const windowTime = 15000;
const requestTimeout = 15000;

// 创建全局可用的axios实例
const requestInstance = axios.create({
	timeout: requestTimeout,
	baseURL: 'https://api.backpack.exchange',
	headers: {
		'Content-Type': 'application/json',
	},
});

requestInstance.interceptors.response.use(
	(response) => {
		// console.log(response.data);
		return response;
	},
	(error) => {

		throw new ExchangeError('Backpack error:' + get(error, 'response.data.message', error.message));
	},
);

axiosRetry(requestInstance, {
	retries: 3,
	retryDelay: axiosRetry.linearDelay(),
	retryCondition: (error) => {
		return error.response?.status !== 429 || error.code === 'ECONNREFUSED';
	},
});

export default class Backpack extends BaseExchange {
	name = 'Backpack';
	/** ---- Helper functions ---- */
	static checkRequiredCredentials(apiKeys: ApiKeys): boolean {
		if (!apiKeys || !apiKeys.apiKey || !apiKeys.secret) {
			throw new ExchangeError(this.name + ': apiKey and secret  are required');
		}
		return true;
	}

	// BTC/USDT => BTC_USDC
	static getMarket(symbolInput: string): Market {
		const market = BaseExchange.getMarket(symbolInput);
		if (market.marketType === "linear") {
			market.symbol = market.symbol.split('/')[0] + '_USDC_PERP';
		} else if (market.marketType === 'spot') {
			market.symbol = market.symbol.split('/')[0] + '_USDC';
		}
		return market;
	}

	static sign(
		apiKeys: ApiKeys,
		url: string,
		instruction: string,
		method: string,
		params: any,
		data?: any,
		headers?: any,
	) {

		const signatureKey = new Uint8Array([...naclUtil.decodeBase64(apiKeys.secret), ...naclUtil.decodeBase64(apiKeys.apiKey)]);
		const timestamp = +new Date();

		const sortedParams = (data || params) === undefined ? '' :  qs.stringify(data || params, {
			sort: (a: string, b: string) => a.localeCompare(b),
		});

		const signMsg = `instruction=${instruction}${sortedParams ? ('&' + sortedParams) : ''}&timestamp=${timestamp}&window=${windowTime}`;

		const signature = naclUtil.encodeBase64(nacl.sign.detached(
			naclUtil.decodeUTF8(signMsg),
			signatureKey
		));

		headers = headers || {};
		headers = Object.assign(headers, {
			"content-type": "application/json; charset=utf-8",
			Accept: "application/json; charset=utf-8",
			"X-API-Key": apiKeys.apiKey,
			"X-Signature": signature,
			"X-Timestamp": timestamp.toString(),
			"X-Window": windowTime.toString(),
		});
		return { url, method, params, headers, data };
	}


	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		const market = this.getMarket(symbol);
		const response = await requestInstance.get('/api/v1/ticker?symbol=' + market.symbol, {
			httpsAgent: getAgent(socksProxy),
		});

		const data = response.data;

		return {
			symbol: symbol,
			last: +data.lastPrice,
			high: +data.high,
			low: +data.low,
			volume: +data.volume,
			bid: 0,
			ask: 0,
		};
	}

	static async fetchOrderBook(
		socksProxy: string,
		symbol: string,
		limit?: number,
	): Promise<OrderBook> {
		const market = this.getMarket(symbol);

		const response = await requestInstance.get('/api/v1/depth?symbol=' + market.symbol, {
			httpsAgent: getAgent(socksProxy),
		});
		const data = response.data;

		return {
			symbol: symbol,
			timestamp: +data.timestamp || new Date().getTime(),
			asks: data.asks.map((item: any) => [+item[0], +item[1]]),
			bids: data.bids.map((item: any) => [+item[0], +item[1]]).reverse(),
		};
	}

	static parseOrder(order: any, symbol: string) {
		return {
			id: order.id,
			symbol,
			clientOrderId: order.clientId,
			status: order.status.toLowerCase(),
			side: order.side === 'Bid' ? 'buy' : 'sell',
			type: (order.orderType || '').toLowerCase(),
			price: +order.price || 0,
			average: 0,
			amount: +order.quantity,
			filled: order.executedQuantity || 0,
			remaining: +order.quantity,
			info: order
		};
	}

	/** ---- Private API ---- */
	static async fetchBalance(socksProxy: string, apiKeys: ApiKeys): Promise<any> {

		const { url, method, data, headers, params } = this.sign(apiKeys, '/api/v1/account','accountQuery', 'GET', undefined);
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});


		return {
			info: response.data,
		};
	}

	static async fetchOpenOrders(
		socksProxy: string,
		apiKeys: ApiKeys,
		symbol: string,
		since: number | undefined,
		limit: number,
		paramsExtra?: any,
	) {
		const keys = apiKeys || paramsExtra?.apiKeys;
		const market = this.getMarket(symbol);
		const { url, method, data, headers, params } = this.sign(keys, '/api/v1/orders','orderQueryAll', 'GET', {
			symbol: market.symbol
		});
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		// console.log(response.data);

		return response.data.map((order: any) => this.parseOrder(order, symbol));
	}

	static async createOrder(
		socksProxy: string,
		apiKeys: ApiKeys,
		symbol: string,
		type: string,
		side: string,
		amount: number,
		price: number,
		paramsExtra?: any,
	): Promise<any> {

		const keys = apiKeys || paramsExtra?.apiKeys;
		const market = this.getMarket(symbol);
		const orderData = {
			symbol: market.symbol,
      side: side === 'buy' ? 'Bid' : 'Ask',
      orderType: type === 'market' ? 'Market' : 'Limit',
      quantity: amount,
			...omit(paramsExtra || {}, ['apiKeys'])
		}
		// @ts-ignore
		if (price) orderData.price = price;
		const { url, method, data, headers, params } = this.sign(keys, '/api/v1/order','orderExecute', 'POST', undefined, orderData);
		const response = await requestInstance(url, {
			method,
			data,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});

		return this.parseOrder(response.data, symbol);
	}
	/** --- custom api request ---- */
	static async customRequest(
		socksProxy: string,
		apiKeys: ApiKeys | undefined,
		url: string,
		method: string,
		params: any,
		paramsExtra?: any,
	) {
		const keys = apiKeys || paramsExtra?.apiKeys;
		if (keys) {
			return (
				await requestInstance(url, {
					...await this.sign(
						keys,
						url,
						method.toUpperCase(),
						method === 'get' ? params : undefined,
						method !== 'get' ? params : undefined,
					),
					httpsAgent: getAgent(socksProxy),
				})
			).data;
		} else {
			return (
				await requestInstance(url, {
					method: method.toUpperCase(),
					params: method === 'get' ? params : undefined,
					data: method !== 'get' ? params : undefined,
					httpsAgent: getAgent(socksProxy),
				})
			).data;
		}
	}
}

// async function test() {
// 	const apiKeys = {
// 		secret: "",
// 		apiKey: ''
// 	};
// 	// console.log(await Backpack.fetchTicker('socks://127.0.0.1:7890', 'BTC/USDT:USDT'));
// 	// console.log(await Backpack.fetchBalance('socks://127.0.0.1:7890', apiKeys));
// 	console.log(
// 		await Backpack.fetchOpenOrders(
// 			'socks://127.0.0.1:7890',
// 			apiKeys,
// 			'BTC/USDT:USDT',
// 			undefined,
// 			100
// 				),
// 	);
// 	// console.log(await Backpack.createOrder('socks://127.0.0.1:7890', apiKeys, 'BTC/USDT:USDT', 'limit', 'buy', 0.00001,100000, {}));
// 	// console.log(await Bitget.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
// 	// console.log(await Backpack.fetchOrderBook('socks://127.0.0.1:7890', 'BTC/USDT:USDT'));
// }

// test();
