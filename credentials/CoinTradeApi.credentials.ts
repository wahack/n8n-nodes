import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CoinTradeApi implements ICredentialType {
	name = 'coinTradeApi';
	displayName = 'CoinTrade API';
	// documentationUrl = '<your-docs-url>';
	properties: INodeProperties[] = [
		{
			displayName: '交易所',
			name: 'platform',
			type: 'options',
			default: 'binance',
			options: [
				{
					name: 'binance',
					value: 'binance'
				},
				{
					name: 'bybit',
					value: 'bybit'
				},{
					name: 'okx',
					value: 'okx'
				}, {
					name: 'bitget',
					value: 'bitget'
				}
			]
		},
		{
			displayName: 'api key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
			typeOptions: {
				password: true,
			}
		},
		{
			displayName: 'api secret',
			name: 'secret',
			type: 'string',
			default: '',
			required: true,
			typeOptions: {
				password: true,
			}
		},
		{
			displayName: 'api password',
			name: 'password',
			type: 'string',
			default: '',
			required: false,
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					 platform: ['okx']
				}
			}
		},
		// {
		// 	displayName: 'api uid',
		// 	name: 'uid',
		// 	type: 'string',
		// 	default: '',
		// 	required: false,
		// 	displayOptions: {
		// 		show: {
		// 			exchange: ['bybit']
		// 		}
		// 	}
		// }
	];
}
