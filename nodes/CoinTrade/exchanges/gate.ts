import axios from 'axios';
import axiosRetry from 'axios-retry';
import crypto from 'crypto';
import qs from 'qs';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, OrderBook } from './types';
import getAgent  from './agent';
import muder from './helpers/muder';
import { ExchangeError } from './helpers/error';
import { get } from 'radash';
// import BigNumber from 'bignumber.js';


const TIMEOUT = 5000;
// 创建全局可用的axios实例
const requestInstance =  axios.create({
	timeout: TIMEOUT,
  baseURL: 'https://api.gateio.ws',
	headers: {
		'Content-Type': 'application/json',
	}
});

requestInstance.interceptors.response.use(response => {
	return response;
}, error => {
	throw new ExchangeError('gate error:' + get(error, 'response.data.message', error.message));
});

axiosRetry(requestInstance, {
	retries: 3,
	retryDelay: axiosRetry.linearDelay(),
	retryCondition: (error) => {
		return error.response?.status !== 429  || error.code === 'ECONNREFUSED';
	}
});


export default class Gate extends BaseExchange {
	name = 'Gate';
	/** ---- Helper functions ---- */
	static checkRequiredCredentials(apiKeys: ApiKeys): boolean {
		if(!apiKeys || !apiKeys.apiKey || !apiKeys.secret) {
			throw new ExchangeError(this.name + ': apiKey and secret  are required');
		}
		return true;
	}

	static generateSignature(apiKeys: ApiKeys,  str: string): string {
		// 行HMAC-sha256加密 然后将结果转为base64
		return crypto.createHmac('sha512', apiKeys.secret).update(str).digest('hex');
	}

	static sign(apiKeys: ApiKeys, url: string, method: string, params: any, data?: any, headers?: any) {
		this.checkRequiredCredentials(apiKeys);
		// 秒级别
		const timestamp = Math.floor(Date.now() / 1000).toString();
		let endpoint = url.startsWith('http') ? ('/' + url.replace(/.*\.com\/(.*)/, '$1')) : url;
		const query = params ? qs.stringify(params):'';
		// HexEncode(SHA512(Request data))
		const hashPayload = crypto.createHash('sha512').update(data ? JSON.stringify(data) : '').digest('hex');

		const signature = this.generateSignature(apiKeys, method.toUpperCase() + '\n' + endpoint + '\n'+ query +'\n'+ hashPayload + '\n' + timestamp);

		headers = headers || {};
		headers['KEY'] = apiKeys.apiKey;
		headers['SIGN'] = signature;
		headers['Timestamp'] = timestamp;
		return  { url, method, params, headers, data };
	}

	static getMarket(symbolInput: string): Market {
		const market = BaseExchange.getMarket(symbolInput);
		market.symbol = market.symbol.split('/').join('_');
		return market;
	}

	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		const market = this.getMarket(symbol);
		let url = '';
		let params = {currency_pair: market.symbol};
		if (market.marketType === 'spot') {
			url = '/api/v4/spot/tickers';
			const response = await requestInstance.get(url, {
				params,
				httpsAgent: getAgent(socksProxy)
			});
			const data = response.data[0];

			return {
				symbol: symbol,
				last: +data.last,
				high: +data.high_24h,
				low: +data.low_24h,
				volume: +data.base_volume,
				bid: 0,
				ask: 0
			}
		} else{
			url = '/api/v4/futures/usdt/contracts/' + market.symbol;
			const response = await requestInstance.get(url, {
				httpsAgent: getAgent(socksProxy)
			});
			const data = response.data;

			return {
				symbol: symbol,
				last: +data.last_price,
				high: 0,
				low: 0,
				volume: 0,
				bid: 0,
				ask: 0
			}
		}

	}

	static async fetchOrderBook(socksProxy: string, symbol: string, limit: number): Promise<OrderBook> {
		const market = this.getMarket(symbol);
		limit = limit || 5;
		let url = '';
		let params = {limit};
		if (market.marketType === 'spot') {
			url = '/api/v4/spot/order_book';
			// @ts-ignore
			params.currency_pair = market.symbol;
		} else if (market.marketType === 'linear') {
			url = '/api/v4/futures/usdt/order_book';
			// @ts-ignore
			params.contract = market.symbol;
		}

    const response = await requestInstance.get(url, {
      params,
			httpsAgent: getAgent(socksProxy)
    });
		return {
			symbol: symbol,
			timestamp: response.data.current || new Date().getTime(),
			asks: market.marketType === 'spot' ? response.data.asks.map((item: any) => [+item[0], +item[1]]) : response.data.asks.map((item: any) => [+item.p, +item.s]),
			bids: market.marketType === 'spot' ? response.data.bids.map((item: any) => [+item[0], +item[1]]) : response.data.bids.map((item: any) => [+item.p, +item.s])
		}
	}

	/** ---- Private API ---- */
	static async fetchBalance(socksProxy: string, apiKeys: ApiKeys, coin?: string): Promise<any> {
		// const url = '/api/v4/unified/accounts';
		const url = '/api/v4/wallet/total_balance'
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
		let body = {};
		if (market.marketType === 'spot') {
			url = '/api/v4/spot/orders';
			// @ts-ignore
			body =  {currency_pair : market.symbol, side, amount, account:  'unified', type}
			// @ts-ignore
			if (price) body.price = price;
		} else if (market.marketType === 'linear') {
			url = '/api/v4/futures/usdt/orders';
			body = {contract : market.symbol, size:side === 'buy' ? amount: -amount, price: price || 0, tif: price ? 'gtc': 'ioc'}
		}

		const { method,  headers, data } = this.sign(apiKeys, url, 'POST', undefined, body);
		const response = await requestInstance(url, {
			method,
			headers,
			data,
			httpsAgent: getAgent(socksProxy)
		});
		return muder(response.data, {info: response.data, symbol}, {
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
// 	}
// 	// console.log(await Gate.fetchTicker('socks://127.0.0.1:7890', 'BTC/USDT:USDT'));
// 	console.log(await Gate.fetchBalance('', apiKeys));
// 	// console.log(await Bitget.fetchClosedOrders('', apiKeys, 'BTC/USDT:USDT',undefined,20));
// 	// console.log(await Bitget.createOrder('socks://127.0.0.1:7890', apiKeys, 'BTC/USDT:USDT', 'limit', 'buy', 0.001, 63000));
// 	// console.log(await Bitget.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
// 	// console.log(await Gate.fetchOrderBook('socks://127.0.0.1:7890', 'ETH/USDT:USDT', 2));
// }

// test();
