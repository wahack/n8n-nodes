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
		default: 'BTC/USDT',
		required: true,
	},
	{
		displayName: 'Timeframe',
		name: 'timeframe',
		type: 'string',
		default: '1h',
		description: '1m, 15m, 30m, 1h, 4h, 1d, 1w',
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
		default: 50
	},
];

const displayOptions = {
	show: {
		resource: ['market'],
		operation: ['fetchOHLCV'],
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
			const timeframe = this.getNodeParameter('timeframe', i) as string;
			const limit = this.getNodeParameter('limit', i) as number;

			const responseData = await exchanges[platform].fetchOHLCV(proxy, symbol, timeframe, limit)

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
