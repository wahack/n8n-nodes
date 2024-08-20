import type { INodeProperties } from 'n8n-workflow';

import * as withdraw from './withdraw.operation';
import * as coinInfo from './coinInfo.operation';

export { withdraw, coinInfo };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'withdraw',
				value: 'withdraw',
				description: 'withdraw coin on chain ',
				action: 'withdraw fund',
			},
			{
				name: 'coinInfo',
				value: 'coinInfo',
				displayOptions: {
					show: {
						 platform: ['binance']
					}
				},
				description: 'Get information of coins (available for deposit and withdraw) for user.',
				action: 'get coin info',
			}
		],
		default: 'withdraw',
		displayOptions: {
			show: {
				resource: ['fund'],
			},
		},
	},
	...withdraw.description,
	...coinInfo.description,
];
