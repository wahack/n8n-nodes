import axios from 'axios';
import axiosRetry from 'axios-retry';
import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, Market, OrderBook } from './types';
import getAgent from './agent';
import { ExchangeError } from './helpers/error';
import { get } from 'radash';
import BigNumber from 'bignumber.js';
import { privateKeyToAccount } from 'viem/accounts';
import { createCache } from 'cache-manager';
import Instruments from './helpers/grvt-instrucments'
const authHeadersCache = createCache({
  ttl: 23 * 60 * 60 * 1000, // 23 hours
})
// import BigNumber from 'bignumber.js';

// const Instruments = [
// 	{
// 		instrument: 'BTC_USDT_Perp',
// 		instrument_hash: '0x030501',
// 		base: 'BTC',
// 		quote: 'USDT',
// 		kind: 'PERPETUAL',
// 		venues: ['ORDERBOOK', 'RFQ'],
// 		settlement_period: 'PERPETUAL',
// 		base_decimals: 9,
// 		quote_decimals: 6,
// 		tick_size: '0.1',
// 		min_size: '0.001',
// 		create_time: '1733309124234866496',
// 		max_position_size: '100.0',
// 	},
// 	{
// 		instrument: 'ETH_USDT_Perp',
// 		instrument_hash: '0x030401',
// 		base: 'ETH',
// 		quote: 'USDT',
// 		kind: 'PERPETUAL',
// 		venues: ['ORDERBOOK', 'RFQ'],
// 		settlement_period: 'PERPETUAL',
// 		base_decimals: 9,
// 		quote_decimals: 6,
// 		tick_size: '0.01',
// 		min_size: '0.01',
// 		create_time: '1733309124234868556',
// 		max_position_size: '1000.0',
// 	},
// ];

const TIMEOUT = 5000;
// 创建全局可用的axios实例
const requestInstance = axios.create({
	timeout: TIMEOUT,
	baseURL: 'https://trades.grvt.io',
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
		throw new ExchangeError('Grvt error:' + get(error, 'response.data.message', error.message));
	},
);

axiosRetry(requestInstance, {
	retries: 3,
	retryDelay: axiosRetry.linearDelay(),
	retryCondition: (error) => {
		return error.response?.status !== 429 || error.code === 'ECONNREFUSED';
	},
});

export default class Grvt extends BaseExchange {
	name = 'Grvt';
	/** ---- Helper functions ---- */
	static checkRequiredCredentials(apiKeys: ApiKeys): boolean {
		if (!apiKeys || !apiKeys.apiKey || !apiKeys.secret) {
			throw new ExchangeError(this.name + ': apiKey and secret  are required');
		}
		return true;
	}

	// BTC/USDT => BTC_USDT_Perp
	static getMarket(symbolInput: string): Market {
		const market = BaseExchange.getMarket(symbolInput);
		market.symbol = market.symbol.split('/')[0] + '_USDT_Perp';
		return market;
	}

	static async sign(
		apiKeys: ApiKeys,
		url: string,
		method: string,
		params: any,
		data?: any,
		headers?: any,
	) {

		headers = headers || {};
		headers = Object.assign(headers, await this.getAuthHeaders('', apiKeys));
		return { url, method, params, headers, data };
	}
	static async  buildOrderSignature(priKey: string, order: any) {
		const timeNowNs = BigInt(Date.now()) * BigInt(1_000_000); // 当前时间的纳秒
		const oneHoursNs = BigInt(29 * 24 * 60 * 60) * BigInt(1_000_000_000); // 29天的纳秒
		const futureTimeNs = timeNowNs + oneHoursNs; // 29天后的时间
		const expiration = BigInt(futureTimeNs.toString()); // 转为字符串
		const nonce = Math.floor(Math.random() * 1000000000); // 随机数
		const legs = order.l.map((leg: any) => {
			const instrument = Instruments.find((item) => item.instrument === leg.i);
			if (!instrument) {
				throw new Error('Instrument not found');
			}
			const PRICE_MULTIPLIER = new BigNumber(1_000_000_000);
			const sizeMultiplier = new BigNumber(10).pow(instrument.base_decimals);

			const sizeInt = new BigNumber(leg.s)
			.multipliedBy(sizeMultiplier)
			.integerValue(BigNumber.ROUND_FLOOR)
			.toFixed(0);

			const priceInt = new BigNumber(leg.lp)
			.multipliedBy(PRICE_MULTIPLIER)
			.integerValue(BigNumber.ROUND_FLOOR)
			.toFixed(0);

			return {
				"assetID": instrument.instrument_hash as `0x${string}`,
				"contractSize": BigInt(sizeInt),
				"limitPrice": BigInt(priceInt),
				"isBuyingContract": leg.ib,
			}
		})

		const timeInForce = {
			GOOD_TILL_TIME: 1,
			ALL_OR_NONE: 2,
			IMMEDIATE_OR_CANCEL: 3,
			FILL_OR_KILL: 4,
		};
		const orderTypeData = {
			primaryType: 'Order',
			types: {
				// EIP712Domain: [
				// 	{ name: 'name', type: 'string' },
				// 	{ name: 'version', type: 'string' },
				// 	{ name: 'chainId', type: 'uint256' },
				// 	{ name: 'verifyingContract', type: 'address' },
				// ],
				Order: [
					{ name: 'subAccountID', type: 'uint64' },
					{ name: 'isMarket', type: 'bool' },
					{ name: 'timeInForce', type: 'uint8' },
					{ name: 'postOnly', type: 'bool' },
					{ name: 'reduceOnly', type: 'bool' },
					{ name: 'legs', type: 'OrderLeg[]' },
					{ name: 'nonce', type: 'uint32' },
					{ name: 'expiration', type: 'int64' },
				],
				OrderLeg: [
					{ name: 'assetID', type: 'uint256' },
					{ name: 'contractSize', type: 'uint64' },
					{ name: 'limitPrice', type: 'uint64' },
					{ name: 'isBuyingContract', type: 'bool' },
				],
			},
			domain: {
				name: 'GRVT Exchange',
				version: '0',
				chainId: 325,
			},
			message: {
				subAccountID: BigInt(order.sa),
				isMarket: order.im,
				timeInForce: timeInForce[order.ti as keyof typeof timeInForce],
				postOnly: false,
				reduceOnly: false,
				legs: legs,
				nonce,
				expiration: expiration,
			},
		};
		const account = privateKeyToAccount(priKey as `0x${string}`);
		const signature = await account.signTypedData({
			domain: orderTypeData.domain,
			types: orderTypeData.types,
			primaryType: 'Order',
			message: orderTypeData.message,
		});
		const r = `0x${signature.slice(2, 66)}`; // 前 64 字节为 r
		const s = `0x${signature.slice(66, 130)}`; // 接下来的 64 字节为 s
		const v = parseInt(signature.slice(130, 132), 16); // 最后一个字节为 v
		return {
			r,s1: s,v,n: +nonce,e: expiration.toString(),s: account.address
		};
	}

	static async getAuthHeaders(socksProxy: string, apiKeys: ApiKeys) {
		const cacheKey = apiKeys.apiKey + '_grvt_cookie'
		let headers = await authHeadersCache.get(cacheKey);
		if (headers) {
			return headers;
		}
		const res = await requestInstance.post('https://edge.grvt.io/auth/api_key/login', {
			api_key: apiKeys.apiKey
		}, {
			headers: {
				Cookie: 'rm=true;',
			},
			httpsAgent: getAgent(socksProxy)
		})
		const cookie = (res.headers['set-cookie']||[])[0] || '';
		const accountId = res.headers['x-grvt-account-id'];

		headers = {
			Cookie: cookie,
			'X-Grvt-Account-Id': accountId,
		};

		await authHeadersCache.set(cacheKey, headers);

		return headers;
	}

	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		const market = this.getMarket(symbol);
		let url = 'https://market-data.grvt.io/full/v1/mini';
		let params = { instrument: market.symbol };

		const response = await requestInstance.post(url, params, {
			httpsAgent: getAgent(socksProxy),
		});

		const data = response.data.result;

		return {
			symbol: symbol,
			last: +data.last_price,
			high: 0,
			low: 0,
			volume: +data.last_size,
			bid: +data.best_bid_price,
			ask: +data.best_ask_price,
		};
	}

	static async fetchOrderBook(
		socksProxy: string,
		symbol: string,
		limit: number,
	): Promise<OrderBook> {
		const market = this.getMarket(symbol);
		limit = limit || 10;
		let url = 'https://market-data.grvt.io/full/v1/book';
		let params = { instrument: market.symbol, depth: limit };

		const response = await requestInstance.post(url, params, {
			httpsAgent: getAgent(socksProxy),
		});
		const data = response.data.result;

		return {
			symbol: symbol,
			timestamp: +data.event_time || new Date().getTime(),
			asks: data.asks.map((item: any) => [+item.price, +item.size]),
			bids: data.bids.map((item: any) => [+item.price, +item.size]),
		};
	}

	static parseOrder(order: any, symbol: string) {
		return {
			id: order.oi,
			symbol,
			clientOrderId: order.m.co,
			status: order.s1.s.toLowerCase(),
			side: order.l[0].ib ? 'buy' : 'sell',
			type: order.im ? 'market' : 'limit',
			price: +order.l[0].lp,
			average: 0,
			amount: +order.l[0].s,
			filled: 0,
			remaining: +order.l[0].s,
			info: order,
		};
	}

	/** ---- Private API ---- */
	static async fetchBalance(socksProxy: string, apiKeys: ApiKeys, sub_account_id?: string): Promise<any> {
		const url = '/full/v1/account_summary';
		const headers = await this.getAuthHeaders(socksProxy, apiKeys);
		console.log(headers);

		const response = await requestInstance(url, {
			method: 'POST',
			// @ts-ignore
			headers,
			data: {
				// @ts-ignore
				sub_account_id, // headers['X-Grvt-Account-Id']
			},
			httpsAgent: getAgent(socksProxy),
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

		const response = await requestInstance('https://trades.grvt.io/lite/v1/open_orders', {
			method: 'POST',
			// @ts-ignore
			headers: paramsExtra.headers || await this.getAuthHeaders(socksProxy, keys),
			data: {
				sa: paramsExtra.sub_account_id,
				k: ['PERPETUAL'],
				b: [symbol.split('/')[0]],
				q: ['USDT'],
			},
			httpsAgent: getAgent(socksProxy),
		});

		return response.data.r.map((order: any) => this.parseOrder(order, symbol));
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
		const market = this.getMarket(symbol);
		const keys = apiKeys || paramsExtra?.apiKeys;

		let url = 'https://trades.grvt.io/lite/v1/create_order';
		const body = {
			o: {
				sa: paramsExtra.sub_account_id,
				im: type === 'market',
				ti: 'GOOD_TILL_TIME',
				po: false,
				ro: false,
				l: [
					{
						i: market.symbol,
						s: amount.toString(),
						lp: (price|| 0).toString(),
						ib: side === 'buy',
					},
				],
				m: {
					co: new Date().getTime().toString()
				},
			},
		};
		// @ts-ignore
		body.o.s = await this.buildOrderSignature(keys.secret, body.o)
		const response = await requestInstance(url, {
			method: 'POST',
			// @ts-ignore
			headers: paramsExtra.headers || await this.getAuthHeaders(socksProxy, keys),
			data: body,
			httpsAgent: getAgent(socksProxy),
		});
		return this.parseOrder(response.data.r, symbol);
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
// 		secret: ""
// 	};
// 	// console.log(await Grvt.fetchTicker('socks://127.0.0.1:7890', 'BTC/USDT:USDT'));
// 	// console.log(await Grvt.getAuthHeaders('socks://127.0.0.1:7890', apiKeys));
// 	// console.log(await Grvt.fetchBalance('socks://127.0.0.1:7890', apiKeys));
// 	// console.log(
// 	// 	await Grvt.fetchOpenOrders(
// 	// 		'socks://127.0.0.1:7890',
// 	// 		undefined,
// 	// 		'BTC/USDT:USDT',
// 	// 		undefined,
// 	// 		20,
// 	// 		{sub_account_id: "", apiKeys: {
// 	// 			apiKey: '',
// 	// 			secret: ''
// 	// 		}, headers: {
// 	// 			Cookie: '',
// 	// 			'x-grvt-account-id': ''
// 	// 		}},
// 	// 	),
// 	// );
// 	// console.log(await Grvt.createOrder('socks://127.0.0.1:7890', undefined, 'BTC/USDT:USDT', 'limit', 'buy', 0.001,90000, {
// 	// 	sub_account_id: "", apiKeys: {
// 	// 		apiKey: '',
// 	// 		secret: ''
// 	// 	}, headers: {
// 	// 		Cookie: '',
// 	// 		'x-grvt-account-id': ''
// 	// 	}
// 	// }));
// 	// console.log(await Bitget.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
// 	// console.log(await Grvt.fetchOrderBook('socks://127.0.0.1:7890', 'BTC/USDT:USDT'));
// }

// test();
