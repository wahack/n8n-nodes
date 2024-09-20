import type { INodeProperties } from 'n8n-workflow';

import * as createOrder from './createOrder.operation';
import * as fetchOrder from './fetchOrder.operation';
import * as cancelOrder from './cancelOrder.operation';
import * as cancelAllOrders from './cancelAllOrders.operation';
import * as fetchClosedOrder from './fetchClosedOrder.operation';

import * as fetchClosedOrders from './fetchClosedOrders.operation';

import * as fetchOpenOrder from './fetchOpenOrder.operation';

import * as fetchOpenOrders from './fetchOpenOrders.operation';


export { createOrder, fetchOrder, cancelOrder, cancelAllOrders, fetchClosedOrder, fetchClosedOrders, fetchOpenOrder, fetchOpenOrders };

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
			},
			{
				name: 'Fetch Order',
				value: 'fetchOrder',
				description: 'Fetch an order',
				action: 'Fetch an order',
			},
			{
				name: 'Cancel Order',
				value: 'cancelOrder',
				description: 'Cancel an order',
				action: 'Cancel an order',
			},
			{
				name: 'Cancel All Orders',
				value: 'cancelAllOrders',
				description: 'Cancel all open orders',
				action: 'Cancel all orders',
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
	...fetchOrder.description,
	...cancelOrder.description,
	...cancelAllOrders.description,
	...fetchClosedOrder.description,
	...fetchClosedOrders.description,
	...fetchOpenOrder.description,
	...fetchOpenOrders.description
];
