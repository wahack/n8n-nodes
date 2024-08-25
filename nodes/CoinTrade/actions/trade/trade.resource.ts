import type { INodeProperties } from 'n8n-workflow';

import * as createOrder from './createOrder.operation';

export { createOrder };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create Order',
				value: 'createOrder',
				description: 'Place an order',
				action: 'Place an order',
			}
		],
		default: 'createOrder',
		displayOptions: {
			show: {
				resource: ['trade'],
			},
		},
	},
	...createOrder.description,
];
