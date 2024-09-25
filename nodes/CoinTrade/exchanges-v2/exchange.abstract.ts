import { Ticker, ApiKeys, MarketType, Market, ResponseWrap } from './types';

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

}
