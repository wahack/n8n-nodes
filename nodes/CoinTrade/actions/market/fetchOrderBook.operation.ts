import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';
import {binance} from 'ccxt';

import {
	updateDisplayOptions
} from '../../../../utils/utilities';


const properties: INodeProperties[] = [
	{
		displayName: 'symbol',
		name: 'symbol',
		type: 'string',
		default: 'BTC/USDT',
		required: true,
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

	// const platform = this.getNodeParameter('platform', 0);
	const proxy = this.getNodeParameter('proxy', 0) as string;
	const exchange = new binance({
		proxy
	});

	for (let i = 0; i < length; i++) {
		try {
			const symbol = this.getNodeParameter('symbol', i) as string;

			const responseData = await exchange.fetchOrderBook(symbol)

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
