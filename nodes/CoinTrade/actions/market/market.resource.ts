import type { INodeProperties } from 'n8n-workflow';

import * as fetchTicker from './fetchTicker.operation';
import * as fetchOrderBook from './fetchOrderBook.operation';
import * as fetchOHLCV from './fetchOHLCV.operation';

export { fetchTicker, fetchOrderBook, fetchOHLCV };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Fetch Ticker',
				value: 'fetchTicker',
				description: 'Fetch latest ticker data by trading symbol',
				action: 'Fetch ticker',
			},
			{
				name: 'Fetch Order Book',
				value: 'fetchOrderBook',
				description: 'Fetch L2/L3 order book for a particular market trading symbol',
				action: 'Fetch order book',
			},
			{
				name: 'Fetch OHLCV',
				value: 'fetchOHLCV',
				description: 'Fetch OHLCV Candlestick Charts',
				action: 'Fetch OHLCV',
			}
		],
		default: 'fetchTicker',
		displayOptions: {
			show: {
				resource: ['market'],
			},
		},
	},
	...fetchTicker.description,
	...fetchOrderBook.description,
	...fetchOHLCV.description
];
