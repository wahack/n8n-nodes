import axios from 'axios';
import axiosRetry from 'axios-retry';
import crypto from 'crypto';
import qs from 'qs';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, OrderBook } from './types';
import getAgent  from './agent';
import muder from './helpers/muder';
import { ExchangeError } from './helpers/error';
import { get } from 'lodash';
// import BigNumber from 'bignumber.js';


const TIMEOUT = 5000;
// 创建全局可用的axios实例
const requestInstance =  axios.create({
	timeout: TIMEOUT,
  baseURL: 'https://api.bitget.com',
	headers: {
		'Content-Type': 'application/json',
	}
});

requestInstance.interceptors.response.use(response => {
	// console.log(response.data);

	if (response.data.code !== '00000') {
		throw new ExchangeError('Bitget error:' +response.data.msg);
	}
	return response;
}, error => {
	throw new ExchangeError('Bitget error:' + get(error, 'response.data.msg', error.message));
});

axiosRetry(requestInstance, {
	retries: 3,
	retryDelay: axiosRetry.linearDelay(),
	retryCondition: (error) => {
		return error.response?.status !== 429  || error.code === 'ECONNREFUSED';
	}
});


export default class Bitget extends BaseExchange {
	name = 'Bitget';
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
		if (params) {
			endpoint += '?' + qs.stringify(params, {
				// 需按key字母序升序
				sort: (a, b) => a.localeCompare(b)
			});
		}
		const signature = this.generateSignature(apiKeys, timestamp + method.toUpperCase() + endpoint + (data ? JSON.stringify(data) : ''));
		headers = headers || {};
		headers['ACCESS-KEY'] = apiKeys.apiKey;
		headers['ACCESS-SIGN'] = signature;
		headers['ACCESS-TIMESTAMP'] = timestamp;
		headers['ACCESS-PASSPHRASE'] = apiKeys.password;
		headers['locale'] = 'en-US';
		headers['Content-Type'] = 'application/json';
		return  { url, method, params, headers, data };
	}

	static getMarket(symbolInput: string): Market {
		const market = BaseExchange.getMarket(symbolInput);
		market.symbol = market.symbol.split('/').join('');
		return market;
	}

	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		const market = this.getMarket(symbol);
		let url = '';
		let params = {symbol: market.symbol};
		if (market.marketType === 'spot') {
			url = '/api/v2/spot/market/tickers';
		} else if (market.marketType === 'linear') {
			url = '/api/v2/mix/market/ticker';
			// @ts-ignore
			params.productType = 'USDT-FUTURES';
		}
    const response = await requestInstance.get(url, {
      params,
			httpsAgent: getAgent(socksProxy)
    });
		const data = response.data.data[0];

		return {
			symbol: symbol,
			last: +data.lastPr,
			high: +data.high24h,
			low: +data.low24h,
			volume: +data.baseVolume,
			bid: +data.bidPr,
			ask: +data.askPr
		}
	}

	static async fetchOrderBook(socksProxy: string, symbol: string, limit: number): Promise<OrderBook> {
		const market = this.getMarket(symbol);
		limit = limit || 5;
		let url = '';
		let params = {symbol: market.symbol, limit};
		if (market.marketType === 'spot') {
			url = '/api/v2/spot/market/orderbook';
		} else if (market.marketType === 'linear') {
			url = '/api/v2/mix/market/merge-depth';
			// @ts-ignore
			params.productType = 'USDT-FUTURES';
		}

    const response = await requestInstance.get(url, {
      params,
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
		const url = '/api/v2/spot/account/assets';
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
		const body = {symbol: market.symbol, side, size: amount,orderType: type, force: 'gtc'}
		if (market.marketType === 'spot') {
			url = '/api/v2/spot/trade/place-order';
		} else if (market.marketType === 'linear') {
			url = '/api/v2/mix/order/place-order';
			// @ts-ignore
			body.marginMode = 'crossed';
			// @ts-ignore
			body.marginCoin = 'USDT';
		}
		// @ts-ignore
		if (price) data.price = price
		const { method,  headers, data } = this.sign(apiKeys, url, 'POST', undefined, body);
		const response = await requestInstance(url, {
			method,
			headers,
			data,
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
// 	console.log(await Bitget.fetchTicker('socks://127.0.0.1:7890', 'BTC/USDT'));
// 	// console.log(await Bitget.fetchBalance('', apiKeys));
// 	// console.log(await Bitget.fetchClosedOrders('', apiKeys, 'BTC/USDT:USDT',undefined,20));
// 	// console.log(await Bitget.createOrder('socks://127.0.0.1:7890', apiKeys, 'BTC/USDT:USDT', 'limit', 'buy', 0.001, 63000));
// 	// console.log(await Bitget.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
// 	// console.log(await Bitget.fetchOrderBook('socks://127.0.0.1:7890', 'ETH/USDT', 2));
// }

// test();
