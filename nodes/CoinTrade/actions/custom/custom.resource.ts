import type { INodeProperties } from 'n8n-workflow';

import * as customApi from './customApi.operation';
import * as customMethod from './customMethod.operation';

export { customApi, customMethod };

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
			{
				name: 'Custom Method',
				value: 'customMethod',
				action: 'Custom method call',
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
	...customMethod.description
];
