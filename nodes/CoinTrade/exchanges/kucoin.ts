import axios from 'axios';
import axiosRetry from 'axios-retry';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import qs from 'qs';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, OrderBook } from './types';
import getAgent  from './agent';
import muder from './helpers/muder';
import { ExchangeError } from './helpers/error';
import { get } from 'lodash';
// import BigNumber from 'bignumber.js';

const SPOT_URL = 'https://api.kucoin.com';
const LINEAR_URL = 'https://api-futures.kucoin.com';

// 必须5秒内
const TIMEOUT = 5000;
// 创建全局可用的axios实例
const requestInstance =  axios.create({
	timeout: TIMEOUT,
	headers: {
		'Content-Type': 'application/json',
	}
});

requestInstance.interceptors.response.use(response => {
	// console.log(response.data);
	if (response.data.code !== '200000') {
		throw new ExchangeError('kucoin error:' +response.data.msg);
	}
	return response;
}, error => {
	throw new ExchangeError('kucoin error:' + get(error, 'response.data.msg', error.message));
});

axiosRetry(requestInstance, {
	retries: 3,
	retryDelay: axiosRetry.linearDelay(),
	retryCondition: (error) => {
		return error.response?.status !== 429  || error.code === 'ECONNREFUSED';
	}
});


export default class Kucoin extends BaseExchange {
	name = 'Kucoin';
	/** ---- Helper functions ---- */
	static checkRequiredCredentials(apiKeys: ApiKeys): boolean {
		if(!apiKeys || !apiKeys.apiKey || !apiKeys.secret || !apiKeys.password) {
			throw new ExchangeError(this.name + ': apiKey and secret and password are required');
		}
		return true;
	}

	static generateSignature(apiKeys: ApiKeys,  str: string): string {
		// 行HMAC-sha256加密 然后将结果转为base64
		return crypto.createHmac('sha256', apiKeys.secret).update(str).digest('base64');
	}

	static sign(apiKeys: ApiKeys, url: string, method: string, params: any, data?: any, headers?: any) {
		this.checkRequiredCredentials(apiKeys);
		const timestamp = Date.now().toString();
		let endpoint = url.startsWith('http') ? ('/' + url.replace(/.*\.com\/(.*)/, '$1')) : url;
		if (['GET', 'DELETE'].includes(method.toUpperCase()) && params) {
			endpoint += '?' + qs.stringify(params);
		}
		const signature = this.generateSignature(apiKeys, timestamp + method.toUpperCase() + endpoint + (data ? JSON.stringify(data) : ''));
		headers = headers || {};
		headers['KC-API-KEY'] = apiKeys.apiKey;
		headers['KC-API-SIGN'] = signature;
		headers['KC-API-TIMESTAMP'] = timestamp;
		headers['KC-API-PASSPHRASE'] = this.generateSignature(apiKeys, apiKeys.password!);
		headers['KC-API-KEY-VERSION'] = 3;
		return  { url, method, params, headers, data };
	}

	static getMarket(symbolInput: string): Market {
		const market = BaseExchange.getMarket(symbolInput);
		if (market.marketType === 'spot') {
			market.symbol = market.symbol.split('/').join('-');
		} else if (market.marketType === 'linear') {
			// ETH/USDT -> ETHUSDTM
			market.symbol = market.symbol.split('/').join('') + 'M';
		}
		return market;
	}

	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		const market = this.getMarket(symbol);
		let url = '';
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v1/market/orderbook/level1';
		} else if (market.marketType === 'linear') {
			url = LINEAR_URL + '/api/v1/ticker';
		}
    const response = await requestInstance.get(url, {
      params: {
        symbol: market.symbol
      },
			httpsAgent: getAgent(socksProxy)
    });

		return {
			symbol: symbol,
			last: +response.data.data.price,
			high: 0,
			low: 0,
			volume: 0,
			bid: 0,
			ask: 0
		}
	}

	static async fetchOrderBook(socksProxy: string, symbol: string, limit: number): Promise<OrderBook> {
		const market = this.getMarket(symbol);
		limit = limit || 5;
		let url = '';
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v1/market/orderbook/level2_20';
		} else if (market.marketType === 'linear') {
			url = LINEAR_URL + '/api/v1/level2/depth20';
		}

    const response = await requestInstance.get(url, {
      params: {
        symbol: market.symbol
      },
			httpsAgent: getAgent(socksProxy)
    });
		return {
			symbol: symbol,
			timestamp: response.data.data.ts || new Date().getTime(),
			asks: response.data.data.asks.map((item: any) => [+item[0], +item[1]]),
			bids: response.data.data.bids.map((item: any) => [+item[0], +item[1]])
		}
	}

	/** ---- Private API ---- */
	static async fetchBalance(socksProxy: string, apiKeys: ApiKeys, coin?: string): Promise<any> {
		const url = SPOT_URL + '/api/v1/accounts';
		const { method, params, headers } = this.sign(apiKeys, url, 'GET', undefined);
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		// console.log(response.headers);

		return {
			info: response.data
		}
	}

	static async createOrder(socksProxy: string, apiKeys: ApiKeys, symbol: string, type: string, side: string, amount: number, price: number, paramsExtra?: any): Promise<any> {
		const market = this.getMarket(symbol);
		let url ='';
		if (market.marketType === 'spot') {
			url = SPOT_URL + '/api/v1/orders';
		} else if (market.marketType === 'linear') {
			url = LINEAR_URL + '/api/v1/order';
		}
		const data = {clientOid: uuidv4(), symbol: market.symbol, side, size: amount,type}
		// @ts-ignore
		if (price) data.price = price
		const { method, params, headers } = this.sign(apiKeys, url, 'POST', data);
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return muder(response.data.data, {info: response.data, symbol}, {
			id: 'orderId',
		});
	}
 /** --- custom api request ---- */
	static async customRequest(socksProxy: string, apiKeys: ApiKeys | undefined, url: string, method: string, params: any) {
		if (apiKeys) {
			return (await requestInstance(url, {
				...this.sign(apiKeys, url, method.toUpperCase(), method === 'get'? params: undefined, method !== 'get'? params: undefined),
				httpsAgent: getAgent(socksProxy)
			})).data;
		} else {
			return (await requestInstance(url, {
				method: method.toUpperCase(),
				params: method === 'get'? params: undefined,
				data: method !== 'get'? params: undefined,
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
// 	// console.log(await Kucoin.fetchTicker('socks://127.0.0.1:7890', 'BTC/USDT'));
// 	// console.log(await Kucoin.fetchBalance('', apiKeys));
// 	// console.log(await Kucoin.fetchClosedOrders('', apiKeys, 'BTC/USDT:USDT',undefined,20));
// 	// console.log(await Kucoin.createOrder('socks://127.0.0.1:7890', apiKeys, 'BTC/USDT:USDT', 'limit', 'buy', 0.001, 63000));
// 	// console.log(await Kucoin.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
// 	console.log(await Kucoin.fetchOrderBook('socks://127.0.0.1:7890', 'ETHss/USDT:USDT', 10));
// }

// test();
