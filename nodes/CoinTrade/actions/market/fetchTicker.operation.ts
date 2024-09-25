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
	}
];

const displayOptions = {
	show: {
		resource: ['market'],
		operation: ['fetchTicker'],
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

			const responseData = await exchanges[platform].fetchTicker(proxy, symbol)

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
