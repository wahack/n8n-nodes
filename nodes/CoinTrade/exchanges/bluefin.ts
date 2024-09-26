import axios from 'axios';
import axiosRetry from 'axios-retry';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, Order, OrderBook, OHLCV } from './types';
import getAgent  from './agent';
import muder from './helpers/muder';
import { ExchangeError, NetworkRequestError } from './helpers/error';
import BigNumber from 'bignumber.js';
import { Networks, BluefinClient, ORDER_STATUS } from "@bluefin-exchange/bluefin-v2-client";
import { formatUnits } from 'viem';


const BASE_URL = 'https://dapi.api.sui-prod.bluefin.io';
const TIMEOUT = 10000;
// 创建全局可用的axios实例
const requestInstance =  axios.create({
	baseURL: BASE_URL,
	timeout: TIMEOUT,
	headers: {
		'Content-Type': 'application/json'
	}
});

requestInstance.interceptors.response.use(response => {
	// if (response.data.retCode !== 0) {
	// 	console.log(response.data);
	// 	throw new ExchangeError(response.data.retMsg);
	// }
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


export default class Bluefin extends BaseExchange {
	name = 'Bluefin';
	/** ---- Helper functions ---- */
	static checkRequiredCredentials(apiKeys: ApiKeys): boolean {
		if(!apiKeys || !apiKeys.apiKey || !apiKeys.secret) {
			throw new ExchangeError(this.name + ': apiKey and secret are required');
		}
		return true;
	}

	static parseOrder(order: any, symbol: string) {
		const orderStatus: Record<string, string> = {
			[ORDER_STATUS.PENDING]: 'open',
			[ORDER_STATUS.CANCELLING]: 'open',
			[ORDER_STATUS.PARTIAL_FILLED]: 'open',
			[ORDER_STATUS.STAND_BY]: 'open',
			[ORDER_STATUS.STAND_BY_PENDING]: 'open',
			OPEN: 'open',//(not filled or partially filled)
			CANCELLED: 'canceled',
			EXPIRED: "expired",
			REJECTED: "rejected",
			FILLED: "closed"
		}
		return muder<Order>(order, {info: order, symbol: symbol}, {
			id: 'id|toString',
			clientOrderId: 'clientId',
			status: (data: any) => orderStatus[data.orderStatus] || data.orderStatus,
			side: 'side|toLower',
			type: 'orderType|toLower',
			price: (data: any) => +formatUnits(data.price, 18),
			average: (data: any) => +formatUnits(data.avgFillPrice, 18),
			amount: (data: any) => +formatUnits(data.quantity, 18),
			filled:  (data: any) => +formatUnits(data.filledQty, 18),
			remaining: (data: any) =>  new BigNumber(formatUnits(data.quantity, 18)).minus(formatUnits(data.filledQty, 18)).toNumber()
		})
	}

	static async sign(apiKeys: ApiKeys, url: string, method: string, params?: any, data?: any, headers?: any) {
		this.checkRequiredCredentials(apiKeys);
		const client = new BluefinClient(
			true,
			Networks.PRODUCTION_SUI,
			'0x' + apiKeys.secret,
			"ED25519" //valid values are ED25519 or Secp256k1
		); //passing isTermAccepted = true for compliance and authorizarion
		await client.init();

		// Uses key provided while initializing the client to generate the signature
		const token  =  await client.userOnBoarding();
		headers = headers || {};
		headers['Authorization'] = `Bearer ${token}`;
		return  { url, method, data, headers, params };
	}
	// BTC/USDT => BTC-PERP
	static getMarket(symbolInput: string): Market {
		const market = BaseExchange.getMarket(symbolInput);
		market.symbol = market.symbol.split('/')[0] + '-PERP';
		return market;
	}

	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		const market = this.getMarket(symbol);
    const res = await requestInstance.get('/marketData', {
      params: {
        symbol: market.symbol
      },
			httpsAgent: getAgent(socksProxy)
    });
		return {
			last:  +formatUnits(res.data.lastPrice,18),
			high:  +formatUnits(res.data._24hrHighPrice,18),
			low: +formatUnits(res.data._24hrLowPrice,18),
			volume: +formatUnits(res.data._24hrVolume,18),
			bid:  +formatUnits(res.data.bestBidPrice,18),
			ask:  +formatUnits(res.data.bestAskPrice,18),
			symbol
		}
	}

	static async fetchOrderBook(socksProxy: string, symbol: string, limit: number): Promise<OrderBook> {
		const market = this.getMarket(symbol);
		const res = await requestInstance.get('/orderbook', {
			params: {
				symbol: market.symbol,
				limit
			},
			httpsAgent: getAgent(socksProxy)
		});
		return {
			symbol: symbol,
			timestamp: res.data.lastUpdatedAt,
			asks: res.data.asks.map((item: any) => {
				return [+formatUnits(item[0], 18), +formatUnits(item[1], 18)]
			}),
			bids: res.data.bids.map((item: any) => {
				return [+formatUnits(item[0], 18), +formatUnits(item[1], 18)]
			}),
		}
	}

	static async fetchOHLCV (socksProxy: string, symbol: string, timeframe = '1m', since: number, limit: number, params = {}): Promise<OHLCV[]> {
		const market = this.getMarket(symbol);
		const res = await requestInstance('/candlestickData', {
			params: {
				symbol: market.symbol,
				interval: timeframe,
				limit
			},
			httpsAgent: getAgent(socksProxy)
		})
			return res.data.map((ohlcv: any) => {
				return [
					ohlcv[0],
					+formatUnits(ohlcv[1], 18),
					+formatUnits(ohlcv[2], 18),
					+formatUnits(ohlcv[3], 18),
					+formatUnits(ohlcv[4], 18),
					+formatUnits(ohlcv[5], 18),
				]
			})
	}

	/** ---- Private API ---- */
	static async fetchBalance(socksProxy: string, apiKeys: ApiKeys, coin?: string): Promise<any> {
		const { url, params, method, headers } = await this.sign(apiKeys, '/account', 'GET', undefined);
		const res = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});

		return {
			info: res.data,
			'timestamp': +res.data.updateTimeInMs, // Unix Timestamp in milliseconds (seconds * 1000)
			'USDC': {
					free: +formatUnits(res.data.freeCollateral, 18),
					total: +formatUnits(res.data.walletBalance, 18),
					used: 0
				}
		}
	}

	static async fetchOrder(socksProxy: string, apiKeys: ApiKeys, orderId: string, symbol: string, paramsExtra: any): Promise<Order> {
		const market = this.getMarket(symbol);
		const { url, method, headers, params } =  await this.sign(apiKeys, '/orders', 'GET', {symbol: market.symbol, orderId});
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return this.parseOrder(response.data[0], symbol)
	}

	static async fetchOpenOrders(socksProxy: string, apiKeys: ApiKeys, symbol: string, since: number | undefined, limit: number, paramsExtra?: any): Promise<Order[]> {
		const market = this.getMarket(symbol);
		const { url, method, headers, params } =  await this.sign(apiKeys, '/orders', 'GET', {symbol: market.symbol, statuses: [ORDER_STATUS.OPEN, ORDER_STATUS.PARTIAL_FILLED, ORDER_STATUS.STAND_BY, ORDER_STATUS.STAND_BY_PENDING, ORDER_STATUS.PENDING]});
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
		const { url, method, headers, params } =  await this.sign(apiKeys, '/orders', 'GET', {symbol: market.symbol, statuses: [ORDER_STATUS.FILLED, ORDER_STATUS.CANCELLED]});
		const response = await requestInstance(url, {
			method,
			headers,
			params,
			httpsAgent: getAgent(socksProxy)
		});
		return response.data.map((order: any) => this.parseOrder(order, symbol))
	}

	static async cancelOrder(socksProxy: string, apiKeys: ApiKeys, orderId: string, symbol: string, paramsExtra?: any) {
		const market = this.getMarket(symbol);
		this.checkRequiredCredentials(apiKeys);
		const client = new BluefinClient(
			true,
			Networks.PRODUCTION_SUI,
			'0x' + apiKeys.secret,
			"ED25519" //valid values are ED25519 or Secp256k1
		);
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		await client.init();
		const res = await client.postCancelOrder({
			// @ts-ignore
			hashes: [paramsExtra.orderHash],
			symbol: market.symbol
		})
		return {
			symbol,
			info: res.data.data,
			id: orderId
		}
	}

	static async createOrder(socksProxy: string, apiKeys: ApiKeys, symbol: string, type: string, side: string, amount: number, price: number, paramsExtra?: any): Promise<any> {
		const market = this.getMarket(symbol);
		this.checkRequiredCredentials(apiKeys);
		const client = new BluefinClient(
			true,
			Networks.PRODUCTION_SUI,
			'0x' + apiKeys.secret,
			"ED25519" //valid values are ED25519 or Secp256k1
		);
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		await client.init();
		const orderParams = {
			symbol: market.symbol,
			price: price || 0,
			side: side.toUpperCase(),
			quantity: amount,
			orderType: type.toUpperCase(),
			leverage: 5,
		}
		// @ts-ignore
		const res = await client.postOrder(orderParams);
		return this.parseOrder(res.data, symbol)
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
