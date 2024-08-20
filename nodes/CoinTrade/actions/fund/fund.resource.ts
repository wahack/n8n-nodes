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
				name: 'withdraw',
				value: 'withdraw',
				description: 'withdraw coin on chain ',
				action: 'withdraw fund',
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
];
