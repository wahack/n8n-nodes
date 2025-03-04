import axios from 'axios';
import axiosRetry from 'axios-retry';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, Order, OrderBook, OHLCV } from './types';
import getAgent  from './agent';
import muder from './helpers/muder';
import { ExchangeError, NetworkRequestError } from './helpers/error';
import BigNumber from 'bignumber.js';
import { Networks, BluefinClient, ORDER_STATUS, TRANSFERABLE_COINS } from "@bluefin-exchange/bluefin-v2-client";
import { formatUnits as _formatUnits } from 'viem';
import { get } from 'radash';
import { getWalletBalance, swap } from './helpers/cetus';
import { closePosition, getPoolByName, getUserPositions, openPositionWithFixedAmount, swapAssets } from './helpers/bluefin.spot';
import {toBigNumberStr, bnToBaseStr} from '@firefly-exchange/library-sui'

function formatUnits (a: bigint | number | string, b: number) {
	try {
		return _formatUnits(a ? BigInt(a) : BigInt(0), b)
	} catch (e) {
		return 0
	}
}


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
	throw new NetworkRequestError(get(error, 'response.data.error.message',  error.message));
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
	static clients = new Map<string, BluefinClient>();

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
			[ORDER_STATUS.CANCELLED]: 'canceled',
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
			price: (data: any) => +formatUnits(data.price || 0, 18),
			average: (data: any) => +formatUnits(data.avgFillPrice || 0, 18),
			amount: (data: any) => +formatUnits(data.quantity || 0, 18),
			filled:  (data: any) => +formatUnits(data.filledQty || 0, 18),
			remaining: (data: any) =>  new BigNumber(formatUnits(data.quantity || 0, 18)).minus(formatUnits(data.filledQty || 0, 18)).toNumber()
		})
	}

	static async sign(apiKeys: ApiKeys, url: string, method: string, params?: any, data?: any, headers?: any) {
		this.checkRequiredCredentials(apiKeys);
		const client = await this.getClient('', apiKeys) as BluefinClient
		// Uses key provided while initializing the client to generate the signature
		//const token  =  await client.userOnBoarding();
		// @ts-ignore
		const token = client.apiService.token

		headers = headers || {};
		headers['Authorization'] = `Bearer ${token}`;
		return  { url, method, data, headers, params };
	}

	static async getClient (socksProxy: string, apiKeys: ApiKeys): Promise<BluefinClient> {
		const key = `${apiKeys.apiKey}-${apiKeys.secret}`;
		if (this.clients.get(key)) return this.clients.get(key) as BluefinClient;
		const client = new BluefinClient(
			true,
			Networks.PRODUCTION_SUI,
			'0x' + apiKeys.secret,
			"ED25519" //valid values are ED25519 or Secp256k1
		); //passing isTermAccepted = true for compliance and authorizarion

		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		await client.init();

		this.clients.set(key, client);
		return client;
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

	static async fetchOrder(socksProxy: string, apiKeys: ApiKeys, orderId: string, symbol: string, paramsExtra?: any): Promise<Order> {
		const market = this.getMarket(symbol);
		const keys = apiKeys || paramsExtra?.apiKeys

		// const { url, method, headers, params } =  await this.sign(apiKeys, '/orders', 'GET', {symbol: market.symbol, orderId});
		// const response = await requestInstance(url, {
		// 	method,
		// 	headers,
		// 	params,
		// 	httpsAgent: getAgent(socksProxy)
		// });
		if (!orderId) throw new ExchangeError('params error: orderId is undefined')
		const client = await this.getClient(socksProxy, keys)
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		const res = await client.getUserOrders({
			orderId: +orderId,
			statuses: [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED, ORDER_STATUS.FILLED, ORDER_STATUS.OPEN, ORDER_STATUS.PARTIAL_FILLED]
		})
		if (res.data[0]) {
			return this.parseOrder(res.data[0], symbol)
		}
		const history = await client.getUserTradesHistory({
			symbol: market.symbol,
			limit: 5
			// startTime: Date.now() - 24 * 60 * 60 * 1000
		})
		const traded = history.data.data.find(o => o.orderId == +orderId)
		if (traded) {
			return {
				id: orderId,
				clientOrderId: traded.clientId,
				status: 'closed',
				// @ts-ignore
				side: traded.side.toLocaleLowerCase(),
				// @ts-ignore
				type: traded.associatedOrderType,
				price: +formatUnits(BigInt(traded.price), 18),
				average: +formatUnits(BigInt(traded.price), 18),
				amount: +formatUnits(BigInt(traded.quantity), 18),
				filled:  +formatUnits(BigInt(traded.quantity), 18),
				remaining: 0
			}
		} else {
			// canceled
			return  {
				id: orderId,
				clientOrderId: '',
				status: 'canceled',
				// @ts-ignore
				side: '',
				// @ts-ignore
				type: '',
				price: 0,
				average: 0,
				amount: 0,
				filled:  0,
				remaining: 0
			}
		}
		// if (!res.data[0]) {
		// 	return {
		// 		id: orderId,
		// 		status: 'cancelled',

		// 	}
		// }
	}

	static async fetchOpenOrders(socksProxy: string, apiKeys: ApiKeys, symbol: string, since: number | undefined, limit: number, paramsExtra?: any): Promise<Order[]> {
		const market = this.getMarket(symbol);
		const keys = apiKeys || paramsExtra?.apiKeys

		const { url, method, headers, params } =  await this.sign(keys, '/orders', 'GET', {symbol: market.symbol, statuses: [ORDER_STATUS.OPEN, ORDER_STATUS.PARTIAL_FILLED, ORDER_STATUS.STAND_BY, ORDER_STATUS.STAND_BY_PENDING, ORDER_STATUS.PENDING]});
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
		const keys = apiKeys || paramsExtra?.apiKeys

		this.checkRequiredCredentials(keys);
		const client = await this.getClient(socksProxy, keys) as BluefinClient
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		// @ts-ignore
		// client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		// await client.init();
		const res = await client.postCancelOrder({
			// @ts-ignore
			hashes: [paramsExtra.orderHash],
			symbol: market.symbol
		})
		if (get(res.data, 'error.message')) throw new ExchangeError(get(res.data, 'error.message'))
		return {
			symbol,
			info: res.data.data,
			id: orderId
		}
	}

	static async createOrder(socksProxy: string, apiKeys: ApiKeys, symbol: string, type: string, side: string, amount: number, price: number, paramsExtra?: any): Promise<any> {
		const market = this.getMarket(symbol);
		const keys = apiKeys || paramsExtra?.apiKeys
		this.checkRequiredCredentials(keys);
		const client = await this.getClient(socksProxy, keys) as BluefinClient

		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)

		const orderParams = {
			symbol: market.symbol,
			price: price || 0,
			side: side.toUpperCase(),
			quantity: amount,
			orderType: type.toUpperCase(),
			leverage: paramsExtra?.leverage || 10,
			...paramsExtra
		}
		// @ts-ignore
		const res = await client.postOrder(orderParams);
		if (get(res.data, 'error.message')) throw new ExchangeError(get(res.data, 'error.message'))
		return this.parseOrder(res.data, symbol)
	}

	static async transfer (socksProxy: string, _apiKeys: ApiKeys, to: string, amount: number, coin: TRANSFERABLE_COINS, apiKeys?: ApiKeys) {
		const client = await this.getClient(socksProxy, _apiKeys || apiKeys)

		return await client.transferCoins(to, amount, coin);
	}

	static async setReferral (socksProxy: string, _apiKeys: ApiKeys, referralCode: string, apiKeys?: ApiKeys) {
		// const client = await this.getClient(socksProxy, _apiKeys || apiKeys)
		// // @ts-ignore
		// client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		// return await client.affiliateLinkReferredUser({
		// 	referralCode
		// })
			// v2-yfknyu
		const { url, method, headers, data } =  await this.sign(_apiKeys || apiKeys, '/growth/linkRefereeByCode', 'POST',undefined, {referralCode});
		const response = await requestInstance(url, {
			method,
			headers,
			data,
			httpsAgent: getAgent(socksProxy)
		});
		return response.data
	}
	static async claimRewards (socksProxy: string, _apiKeys: ApiKeys, apiKeys: ApiKeys) {
		const keys = _apiKeys || apiKeys
		const client = await this.getClient(socksProxy, keys)
		const { url, method, headers, data } =  await this.sign(keys, '/growth/claims/breakdown/historical-and-airdrop', 'GET');
		const response = await requestInstance(url, {
			method,
			headers,
			data,
			httpsAgent: getAgent(socksProxy)
		});
		const claimable: any = [];
		response.data.data.historicalRewardsBreakdown.forEach((item: any) => {
			item.claimDetails.forEach((subItem: any) => {
				if (subItem.claimStatus === 'CLAIMABLE') claimable.push(subItem)
			})
		})
		const ret = await client.claimRewards(claimable.map((item:any) => {
				return {
					payload: {
						target: '0x04d3f40f9fde19fbae88b8c5e9f47f138449965a90ac9ab3d14b0eb5bc286fb6',
						receiver: keys.apiKey,
						amount: +toBigNumberStr(bnToBaseStr(item.rewardedPoints), 9),
						expiry: new Date(item.expiry).getTime(),
						nonce: item.nonce,
						type: 1
					},
					signature: item.claimSignature
				}
			}))
		return {result: ret.data}
	}
	static async getVolume (socksProxy: string, _apiKeys: ApiKeys, apiKeys?: ApiKeys) {
		const client = await this.getClient(socksProxy, _apiKeys || apiKeys)
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		const ret = await client.getTradeAndEarnRewardsOverview(1)
		// @ts-ignore
		return {volume: Math.floor(formatUnits(ret.data.totalVolume, 18)), info: ret.data}
	}
	static async getPnl (socksProxy: string, _apiKeys: ApiKeys, apiKeys?: ApiKeys) {
		const client = await this.getClient(socksProxy, _apiKeys || apiKeys)
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		const ret = await client.getUserTransferHistory({pageSize: 20})
		// @ts-ignore
		const rr = await client.getUserAccountData();
		return  {
			pnl: (+formatUnits(ret.data.data.find(i => i.action === 'Deposit')!.amount, 18) - Number(formatUnits(rr.data.accountValue, 18))).toFixed(1)
		}
	}
	static async deposit (socksProxy: string, _apiKeys: ApiKeys, amount: number, apiKeys?: ApiKeys) {
		const client = await this.getClient(socksProxy, _apiKeys || apiKeys)
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		const ret = await client.depositToMarginBank(amount)
		return {result: ret.data}
	}
	static async withdrawUsdc (socksProxy: string, _apiKeys: ApiKeys, apiKeys?: ApiKeys) {
		const client = await this.getClient(socksProxy, _apiKeys || apiKeys)
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		const ret = await client.withdrawFromMarginBank();
		return {result: ret.data}
	}
	static async clearPositions(socksProxy: string, _apiKeys: ApiKeys, symbol: string, apiKeys?: ApiKeys) {
		const keys = _apiKeys || apiKeys;
		const market = this.getMarket(symbol);
		const client = await this.getClient(socksProxy, keys)
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
		await client.cancelAllOpenOrders(market.symbol).catch(() => {})
    const positon = await client.getUserPosition({
      symbol: market.symbol
    })
    // @ts-ignore
    if (positon.data.quantity)
    // @ts-ignore
    return await this.createOrder(socksProxy, keys, symbol, 'market',  positon.data.side === 'BUY'?'sell':'buy', +formatUnits(+positon.data.quantity, 18), 0);
	}
	static async getPosition(socksProxy: string, _apiKeys: ApiKeys, symbol: string, apiKeys?: ApiKeys) {
		const keys = _apiKeys || apiKeys;
		const market = this.getMarket(symbol);
		const client = await this.getClient(socksProxy, keys)
		// @ts-ignore
		client.apiService.apiService.defaults.httpsAgent = getAgent(socksProxy)
    const positon = await client.getUserPosition({
      symbol: market.symbol
    })
    return positon
	}

	static async fetchSpotPositions (socksProxy: string, _apiKeys: ApiKeys, address: string) {
		return {result: await getUserPositions(address) }
	}


	static async closeSpotPosition (socksProxy: string, _apiKeys: ApiKeys, prikey: string, posId: string) {
		return {result: await closePosition(prikey, posId) }
	}

	static async swapAtCetus (socksProxy: string, _apiKeys: ApiKeys, priKey: string, token0: string, token1: string, amountIn: string, recipient: string) {
		return {tx: await swap(priKey, token0, token1, amountIn, recipient)}
	}

	static async getPoolData (socksProxy: string, _apiKeys: ApiKeys,token0: string, token1: string) {
		return {result: await getPoolByName(token0, token1)}
	}

	static async openPosition (socksProxy: string, _apiKeys: ApiKeys, privateKey: string, poolID: string, coinAmount: number, slippage: number, lowerPrice: number, upperPrice: number) {
		return {result: await openPositionWithFixedAmount(privateKey, poolID, coinAmount, slippage, lowerPrice, upperPrice)}
	}

	static async swap (socksProxy: string, _apiKeys: ApiKeys, priKey: string, poolId: string, amountIn: string,   aToB : boolean, slippage?: number) {
		return {result: await swapAssets(priKey, poolId, +amountIn, aToB, true, slippage || 0.05)}
	}
	static async walletBalance (socksProxy: string, _apiKeys: ApiKeys, address: string, coin: string) {
		return {balance: await getWalletBalance(address, coin)}
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
	static async customMethodCall(socksProxy: string, apiKeys: ApiKeys, method: string, data: any[]): Promise<any> {
		if (!Bluefin[method as keyof typeof Bluefin]) {
			throw new Error('method ' + method + ' Not implemented');
		}
		return await (Bluefin[method as keyof typeof Bluefin] as Function)(socksProxy, apiKeys, ...data);
	}


}
