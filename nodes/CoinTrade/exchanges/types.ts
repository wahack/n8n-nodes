export type ApiKeys = {
	apiKey: string;
	secret: string;
	password?: string;
	uid?: string;
}
export type Ticker = {
	symbol: string;
	last: number;
	bid: number;
	ask: number;
	high: number;
	low: number;
	volume: number;
};

export type OHLCV = [
  number, // 时间戳
  number, // 开盘价
  number, // 最高价
  number, // 最低价
  number, // 收盘价
  number  // 交易量
];


export type OrderBook = {
	symbol: string;
	timestamp: number;
	/**升序*/
	asks: [number, number][];
	/**降序*/
	bids: [number, number][];
	info?: any
}


export enum MarketType {
  spot = 'spot',  // 现货
  linear = 'linear',  // 正向永续/期货
  inverse = 'inverse',  // 反向永续/期货
  option = 'option',  // 期权
}

export type Market = {
	symbol: string,
	marketType: MarketType
}

export type RequestInfo = {
	requestInfo?: {
		url: string;
		method: string;
		[key: string]: any;
	};
	info: any;
}

export type Balance = {
	info: any;
}

export type Order = {
	info: any;
	id: string;
	clientOrderId: string;
	symbol: string;
	price: number;
	average: number;
	filled: number;
	remaining: number;
	amount: number;
	side: 'buy' | 'sell';
	type: 'limit' | 'market';
	status: 'canceled' | 'open' | 'closed' | 'rejected' | 'expired';
	timestamp: number;
}
