/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as market from './market/market.resource';
import * as trade from './trade/trade.resource';
import * as fund from './fund/fund.resource';
import * as custom from './custom/custom.resource';


export const description: INodeTypeDescription = {
	displayName: 'Coin Trade',
	name: 'coin trade',
	icon: 'file:cointrade.svg',
	group: ['input'],
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'consume the crypto exchange api',
	defaults: {
		name: 'Coin Trade',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'coinTradeApi',
			displayName: '交易所 api',
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
			displayName: '交易所',
			name: 'platform',
			type: 'options',
			noDataExpression: true,
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
				}
			],
			default: 'binance',
		},
		{
			displayName: '代理',
			name: 'proxy',
			type: 'string',
			default: '',
			placeholder: 'e.g. socks://user:password@ip:port',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Market',
					value: 'market',
				},{
					name: 'Trade',
					value: 'trade'
				},
				{
					name: 'Fund',
					value: 'fund'
				},
				{
					name: 'Custom',
					value: 'custom'
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
