import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Account, privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, http } from "viem";
import { polygon } from "viem/chains";

import crypto from 'crypto';
import qs from 'qs';

import BaseExchange from './exchange.abstract';
import { Ticker, ApiKeys, OrderBook } from './types';
import getAgent from './agent';
import { ExchangeError } from './helpers/error';
import { get } from 'radash';
import { getOrderRawAmounts } from './helpers/polymarket';
// import BigNumber from 'bignumber.js';
const MATIC_CONTRACTS = {
	exchange: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
	negRiskAdapter: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
	negRiskExchange: "0xC5d563A36AE78145C45a50134d48A1215220f80a",
	collateral: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
	conditionalTokens: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
};

const SPOT_URL = 'https://clob.polymarket.com';
const client = createPublicClient({
	chain: polygon,
	transport: http(),
});
// 必须5秒内
const TIMEOUT = 5000;
// 创建全局可用的axios实例
const requestInstance = axios.create({
	timeout: TIMEOUT,
	headers: {
		'Content-Type': 'application/json',
	}
});

requestInstance.interceptors.response.use(response => {
	return response;
}, error => {
	// console.log(error.response.data);

	throw new ExchangeError('polymarket error:' + get(error, 'response.data.error', error.message));
});

axiosRetry(requestInstance, {
	retries: 3,
	retryDelay: axiosRetry.linearDelay(),
	retryCondition: (error) => {
		return error.response?.status !== 429 || error.code === 'ECONNREFUSED';
	}
});

function replaceAll(s: string, search: string, replace: string) {
	return s.split(search).join(replace);
}



const domain = {
	name: "ClobAuthDomain",
	version: "1",
	chainId: 137, // Polygon ChainID 137
};
export default class Polymarket extends BaseExchange {
	name = 'Polymarket';

	/** ---- Helper functions ---- */
	static checkRequiredCredentials(apiKeys: ApiKeys): boolean {
		if (!apiKeys || !apiKeys.apiKey || !apiKeys.secret || !apiKeys.password) {
			throw new ExchangeError(this.name + ': apiKey and secret and password are required');
		}
		return true;
	}

	static generateSignature(apiKeys: ApiKeys, str: string): string {
		// 行HMAC-sha256加密 然后将结果转为base64
		const sig = crypto.createHmac('sha256', Buffer.from(apiKeys.secret, "base64")).update(str).digest('base64');
		// console.log(str, sig);

		// NOTE: Must be url safe base64 encoding, but keep base64 "=" suffix
		// Convert '+' to '-'
		// Convert '/' to '_'
		const sigUrlSafe = replaceAll(replaceAll(sig, "+", "-"), "/", "_");
		return sigUrlSafe;
	}

	// L2: API Key Authentication
	static sign(apiKeys: ApiKeys, account: Account, url: string, method: string, params: any, data?: any, headers?: any) {
		this.checkRequiredCredentials(apiKeys);
		const timestamp = Math.floor(Date.now() / 1000);
		let endpoint = url.startsWith('http') ? ('/' + url.replace(/.*\.com\/(.*)/, '$1')) : url;
		if (params) {
			endpoint += '?' + qs.stringify(params);
		}

		const signature = this.generateSignature(apiKeys, timestamp + method.toUpperCase() + endpoint + (data ? JSON.stringify(data) : ''));
		headers = headers || {};
		headers['POLY_ADDRESS'] = account.address;
		headers['POLY_SIGNATURE'] = signature;
		headers['POLY_TIMESTAMP'] = timestamp;
		headers['POLY_API_KEY'] = apiKeys.apiKey;
		headers['POLY_PASSPHRASE'] = apiKeys.password;
		return { url, method, params, headers, data };
	}

	static async getNonce(address: `0x${string}`) {
		const nonce = await client.getTransactionCount({ address, blockTag: "pending" });
		return nonce
	}

	static async getL1SignHeader(account: Account): Promise<Record<string, string>> {
		const timestamp = Math.floor(Date.now() / 1000).toString();
		if (!account?.signTypedData) {
			throw new Error('Invalid account or signTypedData method not available');
		}
		const nonce = await this.getNonce(account.address);
		const sig = await account.signTypedData({
			domain,
			types: {
				ClobAuth: [
					{ name: "address", type: "address" },
					{ name: "timestamp", type: "string" },
					{ name: "nonce", type: "uint256" },
					{ name: "message", type: "string" },
				],
			},
			primaryType: 'ClobAuth',
			message: {
				address: account.address,
				timestamp,
				// @ts-ignore
				nonce,
				message: 'This message attests that I control the given wallet',
			}
		})
		return {
			'POLY_ADDRESS': account.address,
			'POLY_SIGNATURE': sig,
			'POLY_TIMESTAMP': timestamp,
			'POLY_NONCE': nonce + ''
		}
	}

	static async buildOrderSignature(account: Account, order: any) {
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
					{ name: 'salt', type: 'uint256' },
					{ name: 'maker', type: 'address' },
					{ name: 'signer', type: 'address' },
					{ name: 'taker', type: 'address' },
					{ name: 'tokenId', type: 'uint256' },
					{ name: 'makerAmount', type: 'uint256' },
					{ name: 'takerAmount', type: 'uint256' },
					{ name: 'expiration', type: 'uint256' },
					{ name: 'nonce', type: 'uint256' },
					{ name: 'feeRateBps', type: 'uint256' },
					{ name: 'side', type: 'uint8' },
					{ name: 'signatureType', type: 'uint8' },
				],
			},
			domain: {
				name: 'Polymarket CTF Exchange',
				version: '1',
				chainId: domain.chainId,
				verifyingContract: MATIC_CONTRACTS.negRiskExchange as `0x${string}`,
			},
			message: {
				salt: order.salt,
				maker: order.maker,
				signer: order.signer,
				taker: order.taker,
				tokenId: order.tokenId,
				makerAmount: order.makerAmount,
				takerAmount: order.takerAmount,
				expiration: order.expiration,
				nonce: order.nonce,
				feeRateBps: order.feeRateBps,
				side: order.side === "BUY" ? 0 : 1,
				signatureType: order.signatureType,
			},
		};
		if (!account?.signTypedData) {
			throw new Error('Invalid account or signTypedData method not available');
		}
		const signature = await account.signTypedData({
			domain: orderTypeData.domain,
			types: orderTypeData.types,
			primaryType: 'Order',
			message: orderTypeData.message
	 	})
		return signature
	}



	/** ---- Public API ---- */
	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		const url = SPOT_URL + '/price';

		const response = await requestInstance.get(url, {
			params: {
				token_id: symbol,
				side: 'buy'
			},
			httpsAgent: getAgent(socksProxy)
		});

		return {
			symbol: symbol,
			last: +response.data.price,
			high: 0,
			low: 0,
			volume: 0,
			bid: 0,
			ask: 0
		}
	}

	static async fetchOrderBook(socksProxy: string, symbol: string, limit: number): Promise<OrderBook> {
		const url = SPOT_URL + '/book';

		const response = await requestInstance.get(url, {
			params: {
				token_id: symbol
			},
			httpsAgent: getAgent(socksProxy)
		});
		// console.log(response.data);

		return {
			symbol: symbol,
			timestamp: response.data.timestamp || new Date().getTime(),
			asks: response.data.asks.map((item: any) => [+item.price, +item.size]).reverse().slice(0,10),
			bids: response.data.bids.map((item: any) => [+item.price, +item.size]).reverse().slice(0,10),
			info: {
				market: response.data.market,
				asset_id: response.data.asset_id
			}
		}
	}

	/** ---- Private API ---- */

	static async createApiKey(socksProxy: string, apikeys: ApiKeys | undefined, privateKey: `0x${string}`) {
		const headers = await this.getL1SignHeader(privateKeyToAccount(privateKey))
		const res = await requestInstance.post(`${SPOT_URL}/auth/api-key`, null, {
			headers,
			httpsAgent: getAgent(socksProxy)
		})
		return res.data
	}

	// get exist api keys back
	static async deriveApiKey(socksProxy: string, apikeys: ApiKeys | undefined, privateKey: `0x${string}`) {
		const headers = await this.getL1SignHeader(privateKeyToAccount(privateKey))
		const res = await requestInstance.get(`${SPOT_URL}/auth/derive-api-key`, {
			headers,
			httpsAgent: getAgent(socksProxy)
		})
		return res.data
	}

	static async fetchBalance(socksProxy: string, apiKeys: ApiKeys, coin?: string): Promise<any> {
		// const url = SPOT_URL + '/api/v1/accounts';
		// const { method, params, headers } = this.sign(apiKeys, url, 'GET', undefined);
		// const response = await requestInstance(url, {
		// 	method,
		// 	headers,
		// 	params,
		// 	httpsAgent: getAgent(socksProxy)
		// });
		// // console.log(response.headers);

		return {
			// info: response.data
		}
	}

	static async createOrder(socksProxy: string, _apiKeys: ApiKeys, symbol: string, type: string, side: string, amount: number, price: number, paramsExtra?: any): Promise<any> {
		const url = SPOT_URL + '/order';
		if (!paramsExtra?.privateKey) {
			throw new Error('params error: privateKey is undefined')
		}
		const apiKeys = _apiKeys || paramsExtra.apiKeys;
		const account = privateKeyToAccount(paramsExtra.privateKey as `0x${string}`)
		enum Side {
			BUY = "BUY",
			SELL = "SELL",
		}
		const order = {
			taker: '0x0000000000000000000000000000000000000000',
			maker: account.address,
			signer: account.address,
			nonce: '0',
			expiration: '0',
			signatureType: 0, //EOA
			salt: Math.round(Math.random() * Date.now()),
			tokenId: symbol, // '21742633143463906290569050155826241533067272736897614950488156847949938836455',
			feeRateBps:'0',
			...getOrderRawAmounts(side.toUpperCase() as Side, amount, price || 1, paramsExtra.tickSize),
			side: side.toUpperCase()
		}
		// @ts-ignore
		order.signature = await this.buildOrderSignature(account, order)
		// console.log(order)
		const owner = apiKeys.apiKey;
		const orderType = 'GTC';

		const { method, headers, data } = this.sign(apiKeys, account, url, 'POST', undefined, {
			order,
			owner,
			orderType
		});

		const response = await requestInstance(url, {
			method,
			headers,
			data,
			params: { geo_block_token: undefined },
			httpsAgent: getAgent(socksProxy)
		});
		return response.data
	}
	/** --- custom api request ---- */
	static async customRequest(socksProxy: string, _apiKeys: ApiKeys | undefined, url: string, method: string, params: any,  paramsExtra?: any) {
		const apiKeys = _apiKeys || paramsExtra.apiKeys;
		if (apiKeys && paramsExtra.privateKey ) {
			return (await requestInstance(url, {
				...this.sign(apiKeys, privateKeyToAccount(paramsExtra.privateKey),  url, method.toUpperCase(), method === 'get' ? params : undefined, method !== 'get' ? params : undefined),
				httpsAgent: getAgent(socksProxy)
			})).data;
		} else {
			return (await requestInstance(url, {
				method: method.toUpperCase(),
				params: method === 'get' ? params : undefined,
				data: method !== 'get' ? params : undefined,
				httpsAgent: getAgent(socksProxy)
			})).data;
		}
	}
	static async customMethodCall(socksProxy: string, apiKeys: ApiKeys, method: string, data: any[]): Promise<any> {
		if (!Polymarket[method as keyof typeof Polymarket]) {
			throw new Error('method ' + method + ' Not implemented');
		}
		return await (Polymarket[method as keyof typeof Polymarket] as Function)(socksProxy, apiKeys, ...data);
	}

}


// async function test() {
// 	// const apiKeys = {
// 	// 	apiKey: '',
// 	// 	secret: ''
// 	// }
// 	// console.log(await Polymarket.fetchTicker('socks://127.0.0.1:7890', '21742633143463906290569050155826241533067272736897614950488156847949938836455',1));
// 	// console.log(await Kucoin.fetchBalance('', apiKeys));
// 	// console.log(await Kucoin.fetchClosedOrders('', apiKeys, 'BTC/USDT:USDT',undefined,20));
// 	// console.log(await Kucoin.createOrder('socks://127.0.0.1:7890', apiKeys, 'BTC/USDT:USDT', 'limit', 'buy', 0.001, 63000));
// 	// console.log(await Kucoin.cancelOrder('socks://127.0.0.1:7890', apiKeys, 'c775afc3-6c6a-4cb9-944e-c13a1faac92b', 'BTC/USDT:USDT'));
// 	// console.log(await Polymarket.deriveApiKey('socks://127.0.0.1:7890',undefined,'0xxx'));
// 		// console.log(await Polymarket.createOrder('socks://127.0.0.1:7890',,apiKeys, 'BTC/USDT:USDT', 'limit', 'buy', 0.001, 6300));

// }

// test();
