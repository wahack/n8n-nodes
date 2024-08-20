import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import exchanges from '../../helpers/exchanges';

import {
	updateDisplayOptions,
} from '../../../../utils/utilities';


const properties: INodeProperties[] = [
	{
		displayName: 'symbol',
		name: 'symbol',
		type: 'string',
		default: 'BTC/USDT',
		required: true,
	},{
		displayName: 'isBuy',
		name: 'isBuy',
		type: 'boolean',
		default: true,
		required: false,
	},
	{
		displayName: 'type',
		name: 'type',
		type: 'options',
		default: 'market',
		required: false,
		options: [
			{
				name: 'market',
				value: "market"
			}, {
				name: 'limit',
				value: 'limit'
			}
		]
	},
	{
		displayName: 'amount',
		name: 'amount',
		type: 'number',
		default: '',
		required: true,
	},{
		displayName: 'price',
		name: 'price',
		type: "number",
		default: undefined,
		required: false
	}
];

const displayOptions = {
	show: {
		resource: ['trade'],
		operation: ['createOrder'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;

	const credentials = await this.getCredentials('coinTradeApi');

	for (let i = 0; i < length; i++) {
		try {
			const platform = this.getNodeParameter('platform', i) as string;
			const exchange = exchanges.get(platform)
			const proxy = this.getNodeParameter('proxy', i) as string;
			exchanges.setProxy(exchange, proxy);

			exchanges.setKeys(exchange, credentials.apiKey as string, credentials.secret as string, credentials.password as string, credentials.uid as string)

			const symbol = this.getNodeParameter('symbol', i) as string;
			const isBuy = this.getNodeParameter('isBuy', i) as boolean;
			const type = this.getNodeParameter('type', i) as string;
			const amount = this.getNodeParameter('amount', i) as number;
			const price = this.getNodeParameter('price', i) as number;


			const responseData = await exchange.createOrder(symbol, type, isBuy?'buy':'sell', amount, price)

			exchanges.clearKeys(exchange);

			const executionData = this.helpers.constructExecutionMetaData(
				// wrapData(responseData as IDataObject[]),
				// @ts-ignore
				this.helpers.returnJsonArray(responseData as IDataObject),

				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail(error)) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
