/* eslint-disable n8n-nodes-base/node-class-description-outputs-wrong */
import type {
	IPollFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import moment from 'moment-timezone';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import exchanges from './exchanges';

export class CoinTradeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Coin Trade Trigger',
		name: 'coinTradeTrigger',
		icon: 'file:cointrade.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when  events occur',
		defaults: {
			name: 'Coin Trade Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'coinTradeApi',
				displayName: '交易所 api',
				required: false
			}
		],
		polling: true,
		properties: [
			{
				displayName: '交易所',
				name: 'platform',
				type: 'options',
				noDataExpression: true,
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
					},
					{
						name: 'Kucoin',
						value: 'kucoin',
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'tradeUpdated',
				options: [
					{
						name: '订单成交',
						value: 'tradeUpdated',
					},
				],
			},
			{
				displayName: '交易对',
				name: 'symbol',
				type: 'string',
				default: '',
				required: true
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				description: 'Max number of results to return',
				default: 50
			},

		],
	};


	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const poolTimes = this.getNodeParameter('pollTimes.item', []) as IDataObject[];
		// const event = this.getNodeParameter('event', '') as string;
		const limit = this.getNodeParameter('limit', 20) as number;
		const symbol = this.getNodeParameter('symbol', '') as string;

		const platform = this.getNodeParameter('platform', '') as string;
		const proxy = this.getNodeParameter('proxy', '') as string;
		const credentials = await this.getCredentials('coinTradeApi');

		const now = moment().utc().format();

		const lastTimeChecked = (webhookData.lastTimeChecked as string) || now;


		if (poolTimes.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Please set a poll time');
		}

		let trades
		try {
			trades = await exchanges[platform].fetchMyTrades( proxy, credentials as any, symbol, Date.parse(lastTimeChecked), limit, {});
		} catch (e) {
			return null
		}

		webhookData.lastTimeChecked = now;
		if (Array.isArray(trades) && trades.length !== 0) {
			// @ts-ignore
			return [this.helpers.returnJsonArray({trades})];
		}
		return null;
	}
}
