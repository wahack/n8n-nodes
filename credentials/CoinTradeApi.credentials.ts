import {
	ICredentialType,
	INodeProperties,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	// IAuthenticate,
	IHttpRequestOptions
} from 'n8n-workflow';
import exchanges from '../nodes/CoinTrade/exchanges';

const TEST_URL_FLAG = 'https://example.com' // for test purpose, any site who response 200

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
				},{
					name: 'gate',
					value: 'gate'
				},
				{
					name: 'bluefin',
					value: 'bluefin'
				}
			]
		},
		{
			displayName: 'api key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: false,
			typeOptions: {
				password: true,
			}
		},
		{
			displayName: 'api secret',
			name: 'secret',
			type: 'string',
			default: '',
			required: false,
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
					 platform: ['okx', 'bitget']
				}
			}
		},
		{
			displayName: 'api proxy',
			name: 'proxy',
			type: 'string',
			default: '',
			required: false,
			placeholder: 'e.g. socks://user:password@ip:port',
			description: "provide proxy to test whether api is correct only"
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

	async authenticate (credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		if (requestOptions.baseURL === TEST_URL_FLAG) {
			try {
				const exchange = await exchanges.get(credentials.platform as string)
				exchanges.setKeys(exchange, credentials.apiKey as string,  credentials.secret as string, credentials.password as string)
				exchanges.setProxy(exchange, credentials.proxy as string);
				await exchange.fetchBalance()
				exchanges.setProxy(exchange, '');
				exchanges.clearKeys(exchange)
			}
			catch (e) {
				requestOptions.baseURL = 'https://api.airtable.com/v0/meta/whoami' // for test purpose, put any site who should return error
				return requestOptions
			}
		}
		return requestOptions;
	}
	test: ICredentialTestRequest = {
		request: {
			baseURL: TEST_URL_FLAG,
			timeout: 5000
		}
	};
}
