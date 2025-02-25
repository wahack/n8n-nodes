/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import * as market from './market/market.resource';
import * as trade from './trade/trade.resource';
import * as fund from './fund/fund.resource';
import * as custom from './custom/custom.resource';

export const description: INodeTypeDescription = {
	displayName: 'Coin Trade',
	name: 'coinTrade',
	icon: 'file:cointrade.svg',
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Provide a unified cryptocurrency trading exchange API (markets and trading APIs) compatible with ccxt(https://github.com/ccxt/ccxt), supporting multiple exchanges. The API interface parameters and response data structure are consistent with ccxt standard.',
	defaults: {
		name: 'Coin Trade'
	},
	group: ['input', 'output'],
	inputs: [NodeConnectionType.Main],
	// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
	outputs: [NodeConnectionType.Main],
	credentials: [
		{
			name: 'coinTradeApi',
			displayName: 'coinTradeApi',
			required: false,
			displayOptions: {
				show: {
					resource: ['trade','fund', 'custom'],
				},
			},
		}
	],
	properties: [
		{
			displayName: 'Select Exchange',
			name: 'platform',
			type: 'options',
			noDataExpression: false,
			description: 'Select Exchange for API call',
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'Binance',
					value: 'binance',
				}, {
					name: 'Bybit',
					value: 'bybit',
				}, {
					name: 'Okx',
					value: 'okx',
				},
				{
					name: 'Bitget',
					value: 'bitget',
				},
				{
					name: 'Gate',
					value: 'gate',
				},{
					name: 'Kucoin',
					value: 'kucoin',
				},
				{
					name: 'Bluefin',
					value: 'bluefin',
				},
				{
					name: 'Polymarket',
					value: 'polymarket'
				},{
					name: 'Grvt',
					value: 'grvt'
				},
				{
					name: 'Backpack',
					value: 'backpack'
				}
			],
			default: 'binance',
		},
		{
			displayName: 'Socks Proxy',
			name: 'proxy',
			hint: 'Input Format: socks://user:password@ip:port',
			description: 'Socks proxy for API, if needed',
			type: 'string',
			default: '',
			placeholder: 'e.g. socks://user:password@ip:port',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			// eslint-disable-next-line n8n-nodes-base/node-param-description-weak
			description: 'Select the resource(action) to operate on',
			noDataExpression: true,
			options: [
				{
					name: 'Market',
					value: 'market',
					description: 'Public Market API',
				},{
					name: 'Trade',
					value: 'trade',
					description: 'Private Trade API',
				},
				{
					name: 'Fund',
					value: 'fund',
					description: 'Private Fund API',
				},
				{
					name: 'Custom',
					value: 'custom',
					description: 'Make Custom request',
				}
			],
			default: 'market',
		},

		...market.description,
		...trade.description,
		...fund.description,
		...custom.description
	],
};
