import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import exchanges from '../../exchanges-v2';

import {
	updateDisplayOptions,
} from '../../../../utils/utilities';


const properties: INodeProperties[] = [
	{
		displayName: 'Symbol',
		name: 'symbol',
		type: 'string',
		default: '',
		placeholder: '格式: 现货BTC/USDT, usdt永续BTC/USDT:USDT,币本位永续ETH/USD:ETH',
		description: "格式,现货: BTC/USDT,usdt永续: BTC/USDT:USDT, 币本位永续: ETH/USD:ETH, 掉期合约: BTC/USDT:BTC-211225, 期权: BTC/USD:BTC-240927-40000-C",
	},
	{
		displayName: 'Since',
		name: 'since',
		type: 'string',
		default: '',
		description: 'Timestamp(ms)'
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
	{
		displayName: 'Params',
		name: 'params',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '{}'
	}
];

const displayOptions = {
	show: {
		resource: ['trade'],
		operation: ['fetchOpenOrders'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
function validateJSON(json: string | undefined): object {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = {};
	}
	return result;
}
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;

	const credentials = await this.getCredentials('coinTradeApi');


	for (let i = 0; i < length; i++) {
		try {
			const platform = this.getNodeParameter('platform', i) as string;
			const proxy = this.getNodeParameter('proxy', i) as string;

			const symbol = (this.getNodeParameter('symbol', i) as string);
			const since = (this.getNodeParameter('since', i) as number);
			const limit = (this.getNodeParameter('limit', i) as number);
			const params = validateJSON(this.getNodeParameter('params', i) as string);

			const pastMonth = Date.now() - 30 * 24 * 60 * 60 * 1000;
			const responseData = await exchanges[platform].fetchOpenOrders(proxy, credentials as any, symbol, since ? +since : pastMonth, limit || 10, params || {})

			const executionData = this.helpers.constructExecutionMetaData(
				// wrapData(responseData as IDataObject[]),
				// @ts-ignore
				this.helpers.returnJsonArray({list: responseData} as IDataObject),

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
