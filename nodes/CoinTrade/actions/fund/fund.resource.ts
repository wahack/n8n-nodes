import type { INodeProperties } from 'n8n-workflow';

import * as withdraw from './withdraw.operation';

export { withdraw };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Withdraw',
				value: 'withdraw',
				description: 'Withdraw coin on chain',
				action: 'Withdraw fund',
			},
			{
				name: 'coinInfo',
				value: 'coinInfo',
				displayOptions: {
					show: {
						 platform: ['binance']
					}
				},
				description: 'Get information of coins (available for deposit and withdraw) for user',
				action: 'Get coin info',
			}
		],
		default: 'withdraw',
		displayOptions: {
			show: {
				resource: ['fund'],
			},
		},
	},
	...withdraw.description
];
