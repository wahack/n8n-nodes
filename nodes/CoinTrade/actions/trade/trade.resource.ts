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
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
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
				name: 'Fetch Open Order',
				value: 'fetchOpenOrder',
				description: 'Fetches a single open order by order ID',
				action: 'Fetch an open order',
			},
			{
				name: 'Fetch Order Orders',
				value: 'fetchOpenOrders',
				description: 'Fetches a list of open orders',
				action: 'Fetch an open order',
			},
			{
				name: 'Fetch Closed Order',
				value: 'fetchClosedOrder',
				description: 'Fetches a single closed order by order ID',
				action: 'Fetch an closed order',
			},
			{
				name: 'Fetch Closed Orders',
				value: 'fetchClosedOrders',
				description: 'Fetches a list of canceled orders',
				action: 'Fetch list closed orders',
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
