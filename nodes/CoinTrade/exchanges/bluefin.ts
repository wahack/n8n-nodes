
import BigNumber from 'bignumber.js';
import { Exchange } from 'ccxt';
import { ExchangeError, ArgumentsRequired } from 'ccxt';
import { formatUnits } from 'viem';
import { SocksProxyAgent } from 'socks-proxy-agent';

import type { Balances, Int, Order, OrderBook, OrderSide, OrderType, Str, Ticker, OHLCV, Num, Account, Dict, int } from 'ccxt';
import { Networks, BluefinClient, ORDER_STATUS } from "@bluefin-exchange/bluefin-v2-client";

/**
 * @class bluefin
 * @augments Exchange
 */
export default class bluefin extends Exchange {
		private signingKeyCached: Map<string, string> = new Map();
		private clientCached: Map<string, BluefinClient> = new Map();

		private setSigningKey (key: string, value: string) {
			this.signingKeyCached.set(key, value);
			setTimeout(() => {
				this.signingKeyCached.delete(key);
			}, 30 * 60 * 1000);
		}
		private getSigningKey (key: string) {
			return this.signingKeyCached.get(key)
		}
		private async initSigningKey () {
			this.checkRequiredCredentials ();
			if (this.getSigningKey(this.apiKey)) return;
			const client = new BluefinClient(
				true,
				Networks.PRODUCTION_SUI,
				'0x' + this.secret,
				"ED25519" //valid values are ED25519 or Secp256k1
			); //passing isTermAccepted = true for compliance and authorizarion
			await client.init();

			// Uses key provided while initializing the client to generate the signature
			const authToken  =  await client.userOnBoarding();
			this.setSigningKey(this.apiKey, authToken )
		}
		private async getPrivateClient (): Promise<BluefinClient>{
			this.checkRequiredCredentials ();
			if (this.clientCached.get(this.apiKey)) return this.clientCached.get(this.apiKey)!;
			const client = new BluefinClient(
				true,
				Networks.PRODUCTION_SUI,
				'0x' + this.secret,
				"ED25519" //valid values are ED25519 or Secp256k1
			);
			// @ts-ignore
			client.apiService.apiService.defaults.httpAgent = new SocksProxyAgent(this.socksProxy)
			// @ts-ignore
			client.apiService.apiService.defaults.httpsAgent = new SocksProxyAgent(this.socksProxy)
			try {
				await client.init();
			} catch (e) {
				throw new ExchangeError(this.id + ' FAILED_TO_INITIALIZE_CLIENT')
			}
			this.clientCached.set(this.apiKey, client);
			setTimeout(() => {
				this.clientCached.delete(this.apiKey);
			}, 4 * 60 * 60 * 1000);
			return client;
		}
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'bluefin',
            'name': 'bluefin',
            'countries': [ '' ],
            // 300 calls per minute = 5 calls per second = 1000ms / 5 = 200ms between requests
						'rateLimit': 10, //  5,000 requests per 60 seconds
            'version': '1',
            'pro': false,
            'has': {
                'CORS': undefined,
                'spot': false,
                'margin': false,
                'swap': true,
                'future': false,
                'option': false,
                'addMargin': false,
                'cancelOrder': true,
                'closeAllPositions': false,
                'closePosition': false,
                'createOrder': true,
                'createReduceOnlyOrder': false,
                'fetchAccounts': true,
                'fetchBalance': true,
                'fetchBorrowRateHistory': false,
                'fetchClosedOrders': true,
                'fetchCrossBorrowRate': false,
                'fetchCrossBorrowRates': false,
                'fetchFundingHistory': false,
                'fetchFundingRate': false,
                'fetchFundingRateHistory': false,
                'fetchFundingRates': false,
                'fetchIndexOHLCV': false,
                'fetchIsolatedBorrowRate': false,
                'fetchIsolatedBorrowRates': false,
                'fetchLedger': false,
                'fetchLeverage': false,
                'fetchLeverageTiers': false,
                'fetchMarginMode': false,
                'fetchMarkets': true,
                'fetchMarkOHLCV': false,
                'fetchMyTrades': true,
                'fetchOHLCV': true,
                'fetchOpenInterestHistory': false,
                'fetchOpenOrders': true,
                'fetchOrder': true,
                'fetchOrderBook': true,
                'fetchOrders': true,
                'fetchPosition': false,
                'fetchPositionHistory': false,
                'fetchPositionMode': false,
                'fetchPositions': false,
                'fetchPositionsForSymbol': false,
                'fetchPositionsHistory': false,
                'fetchPositionsRisk': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchTrades': true,
                'fetchTradingFee': true,
                'fetchTradingFees': false,
                'reduceMargin': false,
                'setLeverage': false,
                'setMarginMode': false,
                'setPositionMode': false,
            },
            'urls': {
                'referral': 'https://bluefin-exchange.readme.io/',
                'logo': '',
                'api': {
                    'public': 'https://dapi.api.sui-prod.bluefin.io',
                    'private': 'https://dapi.api.sui-prod.bluefin.io'
                },
                'www': 'https://bluefin-exchange.readme.io/reference/introduction',
                'doc': [
                    'https://bluefin-exchange.readme.io/reference/introduction'
                ],
            },
            'api': {
            },
            'timeframes': {
                '1m': 60,
                '5m': 300,
                '15m': 900,
                '30m': 1800,
                '1h': 3600,
                '3h': 10800,
                '4h': 14400,
                '1d': 86400,
                '3d': 259200,
                '1w': 604800,
            },
            'fees': {
                'trading': {
                    'tierBased': false, // based on volume from your primary currency (not the same for everyone)
                    'percentage': true,
                    'taker': this.parseNumber ('0.0003'),
                    'maker': this.parseNumber ('0.0003'),
                },
            },
						'requiredCredentials': {
							'apiKey': true,
							'secret': true,
						},
            'precisionMode': 4//TICK_SIZE,
        });
    }
		amountToPrecision (symbol: string, amount: string): string {
			return amount;
		}
    async fetchAccounts (): Promise<Account[]> {
			await this.initSigningKey()
			const res = await this.request('/account', 'private', 'GET', undefined, undefined)
			return [res]
    }

    async fetchBalance (): Promise<Balances> {
				await this.initSigningKey()
				const res = await this.request('/account', 'private', 'GET', undefined, undefined)
				//@ts-ignore
        return {
					'info':  res,
					'timestamp': +res.updateTimeInMs, // Unix Timestamp in milliseconds (seconds * 1000)
					'USDC': {
							free: +formatUnits(res.freeCollateral, 18),
							total: +formatUnits(res.walletBalance, 18),
							used: 0
						}
				}
    }

    async fetchOrderBook (symbol: string, limit: Int = undefined, params = {}): Promise<OrderBook> {
			let targetSymbol = symbol.split('/')[0];
			const res = await this.request(`/orderbook?symbol=${targetSymbol}-PERP&limit=${limit || 2}`, 'public', 'GET')
				// @ts-ignore
        return {
					// @ts-ignore
					asks: res.asks.map(item => {
						return [+formatUnits(item[0], 18), +formatUnits(item[1], 18)]
					}),
					// @ts-ignore
					bids: res.bids.map(item => {
						return [+formatUnits(item[0], 18), +formatUnits(item[1], 18)]
					}),
					datetime: res.lastUpdatedAt,
					timestamp: res.lastUpdatedAt,
					// nonce: Int
					symbol
				};
    }

    async fetchOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
			const client = await this.getPrivateClient();

			const res = await client.getUserOrders({
				//@ts-ignore
				orderId: +id, statuses: ["OPEN", "CANCELLED", "CANCELLING", "EXPIRED", "FILLED","REJECTED", "STAND_BY", "PENDING", ORDER_STATUS.STAND_BY_PENDING, ORDER_STATUS.PARTIAL_FILLED]

			})
			try {
				return this.parseOrderData(res.data[0])
			} catch (e) {
				throw new ExchangeError(this.id + 'fetchOrderError ' + id + ': ' + JSON.stringify(res.response))
			}
    }
		parseOrderData(orderData: any): Order {
			// @ts-ignore
			return {
				id: orderData.id + '',
				info: orderData,
				clientOrderId: orderData.clientId,
				timestamp: orderData.createdAt,
				datetime: orderData.updatedAt,
				status: this.parseOrderStatus(orderData.orderStatus),
				lastTradeTimestamp: orderData.updatedAt,
				symbol: orderData.symbol.split('-')[0] + '/USDT:USDT',
				type: orderData.orderType.toLowerCase(),
				side: orderData.side.toLowerCase(),
				price: +formatUnits(orderData.price, 18),
				average:  +formatUnits(orderData.avgFillPrice, 18),
				amount: +formatUnits(orderData.quantity, 18),
				filled: +formatUnits(orderData.filledQty, 18),
				remaining: new BigNumber(formatUnits(orderData.quantity, 18)).minus(formatUnits(orderData.filledQty, 18)).toNumber(),
				triggerPrice: +formatUnits(orderData.triggerPrice, 18),
				reduceOnly: orderData.reduceOnly,
    		postOnly: orderData.postOnly,
				cost: new BigNumber(formatUnits(orderData.filledQty, 18)).multipliedBy(formatUnits(orderData.avgFillPrice, 18)).toNumber(),
			}
		}
    async fetchTicker (symbol: string, params = {}): Promise<Ticker> {
			let targetSymbol = symbol.split('/')[0];
			const res = await this.request(`/marketData?symbol=${targetSymbol}-PERP`, 'public', 'GET')
				// @ts-ignore
        return {
					symbol,
					timestamp: res.lastTime,
					last: +formatUnits(res.lastPrice,18),
					high: +formatUnits(res._24hrHighPrice,18),
					low: +formatUnits(res._24hrLowPrice,18),
					info: res
				};
    }
    async fetchOHLCV (symbol: string, timeframe = '1m', since: Int = undefined, limit: Int = undefined, params = {}): Promise<OHLCV[]> {
			let targetSymbol = symbol.split('/')[0];
			const res = await this.request(`/candlestickData?symbol=${targetSymbol}-PERP&interval=${timeframe}&limit=${limit || 20}`, 'public', 'GET')
				// @ts-ignore
        return res.map(ohlcv => {
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
		parseOrderStatus (status: string) {
			// 'open', 'closed', 'canceled', 'expired', 'rejected'
			const mapper: Record<string, string> = {
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
			return mapper[status] || status
		}
    async createOrder (symbol: string, type: OrderType, side: OrderSide, amount: number, price: Num = undefined, params = {}): Promise<Order> {
			let targetSymbol = symbol.split('/')[0] + '-PERP';
			const orderParams = {
				symbol: targetSymbol,
				price: price || 0,
				side: side.toUpperCase(),
				quantity: amount,
				orderType: type.toUpperCase(),
				leverage: 5,
			}
			const client = await this.getPrivateClient();
			// @ts-ignore
			const res = await client.postOrder(orderParams);
			try {

				return this.parseOrderData(res.data)
			} catch (e) {
				throw new ExchangeError(this.id + ' ' + res.response.message)
			}
    }

    async cancelOrder (id: string, symbol: Str = undefined, params = {}): Promise<Order> {
			if (!symbol) throw new ArgumentsRequired(this.id + 'cancelOrder require symbol')
			let targetSymbol = symbol.split('/')[0] + '-PERP';
			const client = await this.getPrivateClient();
			const res = await client.postCancelOrder({
				// @ts-ignore
				hashes: [params.orderHash],
				symbol: targetSymbol
			})
			// if (!res.data.ok) throw new Error(res.response.message)
			// @ts-ignore
			return {
				info: res.data.data,
				id
			}
    }

    sign (path: string, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = 'https://dapi.api.sui-prod.bluefin.io' + path;
        if ((api === 'private')) {
            this.checkRequiredCredentials ();
						// @ts-ignore
						headers = {
							'Authorization': 'Bearer ' + this.getSigningKey(this.apiKey),
            };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (httpCode: int, reason: string, url: string, method: string, headers: Dict, body: string, response:any, requestHeaders: any, requestBody: any) {
      // console.log(httpCode, reason, url, method, response)
			if (response === undefined) {
            return undefined;
        }
        const error = this.safeValue (response, 'error');
        if (error !== undefined) {
            throw new ExchangeError (this.id + ' ' + this.json (response));
        }
        return undefined;
    }
}
