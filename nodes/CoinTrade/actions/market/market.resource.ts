import type { INodeProperties } from 'n8n-workflow';

import * as fetchTicker from './fetchTicker.operation';
import * as fetchOrderBook from './fetchOrderBook.operation';

export { fetchTicker, fetchOrderBook };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'fetch ticker',
				value: 'fetchTicker',
				description: 'Fetch latest ticker data by trading symbol.',
				action: 'fetch ticker',
			},
			{
				name: 'fetch order book',
				value: 'fetchOrderBook',
				description: 'Fetch L2/L3 order book for a particular market trading symbol.',
				action: 'fetch order book',
			},
		],
		default: 'fetchTicker',
		displayOptions: {
			show: {
				resource: ['market'],
			},
		},
	},
	...fetchTicker.description,
];
