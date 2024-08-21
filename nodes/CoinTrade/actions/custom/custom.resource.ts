import type { INodeProperties } from 'n8n-workflow';

import * as customApi from './customApi.operation';

export { customApi };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'custom api',
				value: 'customApi',
				description: 'custom api',
				action: 'custom api call',
			},
		],
		default: 'customApi',
		displayOptions: {
			show: {
				resource: ['custom'],
			},
		},
	},
	...customApi.description,
];
