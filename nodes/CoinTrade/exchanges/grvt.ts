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
const authHeadersCache = createCache({
  ttl: 23 * 60 * 60 * 1000, // 23 hours
})
// import BigNumber from 'bignumber.js';

const Instruments = [
	{
		instrument: 'BTC_USDT_Perp',
		instrument_hash: '0x030501',
		base: 'BTC',
		quote: 'USDT',
		kind: 'PERPETUAL',
		venues: ['ORDERBOOK', 'RFQ'],
		settlement_period: 'PERPETUAL',
		base_decimals: 9,
		quote_decimals: 6,
		tick_size: '0.1',
		min_size: '0.001',
		create_time: '1733309124234866496',
		max_position_size: '100.0',
	},
	{
		instrument: 'ETH_USDT_Perp',
		instrument_hash: '0x030401',
		base: 'ETH',
		quote: 'USDT',
		kind: 'PERPETUAL',
		venues: ['ORDERBOOK', 'RFQ'],
		settlement_period: 'PERPETUAL',
		base_decimals: 9,
		quote_decimals: 6,
		tick_size: '0.01',
		min_size: '0.01',
		create_time: '1733309124234868556',
		max_position_size: '1000.0',
	},
];

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
		const legs = order.legs.map((leg: any) => {
			const instrument = Instruments.find((item) => item.instrument === leg.instrument);
			if (!instrument) {
				throw new Error('Instrument not found');
			}
			const PRICE_MULTIPLIER = new BigNumber(1_000_000_000);
			const sizeMultiplier = new BigNumber(10).pow(instrument.base_decimals);

			const sizeInt = new BigNumber(leg.size)
			.multipliedBy(sizeMultiplier)
			.integerValue(BigNumber.ROUND_FLOOR)
			.toFixed(0);

			const priceInt = new BigNumber(leg.limit_price)
			.multipliedBy(PRICE_MULTIPLIER)
			.integerValue(BigNumber.ROUND_FLOOR)
			.toFixed(0);

			return {
				"assetID": instrument.instrument_hash as `0x${string}`,
				"contractSize": BigInt(sizeInt),
				"limitPrice": BigInt(priceInt),
				"isBuyingContract": leg.is_buying_asset,
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
				subAccountID: BigInt(order.sub_account_id),
				isMarket: order.is_market,
				timeInForce: timeInForce[order.time_in_force as keyof typeof timeInForce],
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
			r,s,v,nonce: +nonce,expiration: expiration.toString(),signer: account.address
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
			id: order.order_id,
			symbol,
			clientOrderId: order.metadata.client_order_id,
			status: order.state.status.toLowerCase(),
			side: order.legs[0].is_buying_asset ? 'buy' : 'sell',
			type: order.is_market ? 'market' : 'limit',
			price: +order.legs[0].limit_price,
			average: 0,
			amount: +order.legs[0].size,
			filled: 0,
			remaining: +order.legs[0].size,
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

		const response = await requestInstance('https://trades.grvt.io/full/v1/open_orders', {
			method: 'POST',
			// @ts-ignore
			headers: await this.getAuthHeaders(socksProxy, keys),
			data: {
				sub_account_id: paramsExtra.sub_account_id,
				kind: ['PERPETUAL'],
				base: [symbol.split('/')[0]],
				quote: ['USDT'],
			},
			httpsAgent: getAgent(socksProxy),
		});

		return response.data.result.map((order: any) => this.parseOrder(order, symbol));
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

		let url = 'https://trades.grvt.io/full/v1/create_order';
		const body = {
			order: {
				sub_account_id: paramsExtra.sub_account_id,
				is_market: type === 'market',
				time_in_force: 'GOOD_TILL_TIME',
				post_only: false,
				reduce_only: false,
				legs: [
					{
						instrument: market.symbol,
						size: amount.toString(),
						limit_price: (price|| 0).toString(),
						is_buying_asset: side === 'buy',
					},
				],
				metadata: {
					client_order_id: new Date().getTime().toString()
				},
			},
		};
		// @ts-ignore
		body.order.signature = await this.buildOrderSignature(keys.secret, body.order)
		const response = await requestInstance(url, {
			method: 'POST',
			// @ts-ignore
			headers: await this.getAuthHeaders(socksProxy, keys),
			data: body,
			httpsAgent: getAgent(socksProxy),
		});
		return this.parseOrder(response.data.result, symbol);
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
// 	console.log(
// 		await Grvt.fetchOpenOrders(
// 			'socks://127.0.0.1:7890',
// 			apiKeys,
// 			'BTC/USDT:USDT',
// 			undefined,
// 			20,
// 			{sub_account_id: ""},
// 		),
// 	);
// 	// console.log(await Grvt.createOrder('socks://127.0.0.1:7890', apiKeys, 'BTC/USDT:USDT', 'market', 'sell', 0.001,0, {}));
// 	// console.log(await Bitget.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
// 	// console.log(await Grvt.fetchOrderBook('socks://127.0.0.1:7890', 'BTC/USDT:USDT'));
// }

// test();
