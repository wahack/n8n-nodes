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
				name: 'Custom Api',
				value: 'customApi',

				action: 'Custom api call',
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
