import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';
import exchanges from '../../exchanges';

import {
	updateDisplayOptions,
	wrapData
} from '../../../../utils/utilities';


const properties: INodeProperties[] = [
	{
		displayName: 'Symbol',
		name: 'symbol',
		type: 'string',
		default: 'BTC/USDT',
		description: 'Symbol Format: Spot BTC/USDT, USDT Perpetual BTC/USDT:USDT, Coin-Margined Perpetual ETH/USD:ETH',
		required: true,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
		default: 50,

	}
];

const displayOptions = {
	show: {
		resource: ['market'],
		operation: ['fetchOrderBook'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;


	for (let i = 0; i < length; i++) {
		try {
			const platform = this.getNodeParameter('platform', i) as string;
			const proxy = this.getNodeParameter('proxy', i) as string;
			const symbol = this.getNodeParameter('symbol', i) as string;
			const limit = this.getNodeParameter('limit', i) as number;

			const responseData = await exchanges[platform].fetchOrderBook(proxy, symbol, limit || 5)

			const executionData = this.helpers.constructExecutionMetaData(
				// @ts-ignore
				wrapData(responseData as IDataObject[]),
				// @ts-ignore
				// this.helpers.returnJsonArray(responseData as IDataObject),

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
