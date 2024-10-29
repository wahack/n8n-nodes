import { Ticker, ApiKeys, Market, Order, MarketType, OrderBook, OHLCV } from './types';

/**
 * Each class implements the public and private API for a particular crypto exchange. All exchanges are derived from the base Exchange class and share a set of common methods.
 */
export default class BaseExchange {
	/** ---- Helper functions ---- */

	// check if the apiKeys are valid
	static checkRequiredCredentials(apiKeys: ApiKeys): boolean {
		return true
	}


	/**
	 *  get market type from symbol pattern.
	 *
	 *  examples:
	 * 'BTC/USDT' => 'spot'
	 * 'BTC/USD:BTC-211225-60000-P' => 'option' // BTC/USDT put option contract strike price 60000 USDT settled in BTC (inverse) on 2021-12-25
	 * 'ETH/USDT:USDT-211225-40000-C' => 'option' // BTC/USDT call option contract strike price 40000 USDT settled in USDT (linear, vanilla) on 2021-12-25
	 * 'BTC/USD:BTC'  => 'inverse_perpetual' // BTC/USDT inverse perpetual swap contract funded in BTC
	 * 'BTC/USDT:USDT' => 'linear_perpetual' // BTC/USDT linear perpetual swap contract funded in USDT
	 * 'ETH/USD:ETH-210625' => 'inverse_future' // ETH/USDT futures contract settled in ETH (inverse) on 2021-06-25
	 * 'ETH/USDT:USDT-210625' => 'linear_future' // ETH/USDT futures contract settled in USDT (linear, vanilla) on 2021-06-25
	 **/
	static getMarket (symbolInput: string): Market {
		symbolInput = symbolInput.toUpperCase().trim();
		// if symbolInput is match pattern like BTC/USDT
		if (symbolInput.match(new RegExp('^[A-Z]+/[A-Z]+$'))) {
			return {
				symbol: symbolInput,
				marketType: MarketType.spot
			}
		}
		// if symbolInput is match pattern like BTC/USDT:USDT
		if (symbolInput.match(new RegExp('^[A-Z]+/USDT:USDT$'))) {
			return {
				symbol: symbolInput.split(':')[0],
				marketType: MarketType.linear
			}
		}
		// if symbolInput is match pattern like BTC/USD:BTC, ETH/USD:ETH, SUI/USD:SUI
		if (symbolInput.match(new RegExp('^[A-Z]+/USD:[A-Z]+$'))) {
			return {
				symbol: symbolInput.split(':')[0],
				marketType: MarketType.inverse
			}
		}
		// if symbolInput is match pattern like BTC/USDT:BTC-211225-60000-P, ETH/USDT:ETH-210625-40000-C
		if (symbolInput.match(new RegExp('^[A-Z]+/[A-Z]+:[A-Z]+-[0-9]+-[0-9]+-[CP]$'))) {
			return {
				symbol: symbolInput.split(':')[0],
				marketType: MarketType.option
			}
		}
		throw new Error('Invalid symbol input');
	}

	static async fetchTicker(socksProxy: string, symbol: string): Promise<Ticker> {
		throw new Error('Not implemented');
	}
	static async fetchOrderBook(socksProxy: string, symbol: string, limit: number): Promise<OrderBook> {
		throw new Error('Not implemented');
	}
	// The list of candles is returned sorted in ascending (historical/chronological) order, oldest candle first, most recent candle last.
	static async fetchOHLCV (socksProxy: string, symbol: string, timeframe = '1m', since: number, limit: number, params = {}): Promise<OHLCV[]> {
		throw new Error('Not implemented');
	}
	static async fetchBalance(socksProxy: string, apikeys: ApiKeys, coin?: string): Promise<any> {
		throw new Error('Not implemented');
	}
	static async fetchOpenOrders(socksProxy: string, apikeys: ApiKeys, symbol: string, since: number, limit: number, params: any): Promise<Order[]> {
		throw new Error('Not implemented');
	}
	static async fetchClosedOrders(socksProxy: string, apikeys: ApiKeys, symbol: string, since: number, limit: number, params: any): Promise<Order[]> {
		throw new Error('Not implemented');
	}
	static async fetchOrder(socksProxy: string, apikeys: ApiKeys, orderId: string, symbol: string, params: any): Promise<Order> {
		throw new Error('Not implemented');
	}
	static async createOrder(socksProxy: string, apikeys: ApiKeys, symbol: string, type: string, side: string, amount: number, price: number, params: any) {
		throw new Error('Not implemented');
	}
	static async cancelOrder(socksProxy: string, apikeys: ApiKeys, orderId: string, symbol: string, params: any): Promise<any> {
		throw new Error('Not implemented');
	}
	static async cancelOrders(socksProxy: string, apikeys: ApiKeys, symbol: string, params: any): Promise<any> {
		throw new Error('Not implemented');
	}
	static async cancelAllOrders(socksProxy: string, apikeys: ApiKeys, symbol: string, params: any): Promise<any> {
		throw new Error('Not implemented');
	}
	static async customRequest(socksProxy: string, apikeys: ApiKeys, path: string, method: string, data: any): Promise<any> {
		throw new Error('Not implemented');
	}
	static async customMethodCall(socksProxy: string, apikeys: ApiKeys, method: string, data: any[]): Promise<any> {
		throw new Error('Not implemented');
	}
	static async withdraw(socksProxy: string, apikeys: ApiKeys, path: string, method: string, data: any, tag: string, network: string): Promise<any> {
		throw new Error('Not implemented');
	}
	static async fetchMyTrades(socksProxy: string, apikeys: ApiKeys, symbol: string, since: number, limit: number, params: any): Promise<any> {
		throw new Error('Not implemented');
	}
}
