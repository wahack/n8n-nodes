import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import exchanges from '../../exchanges';

import {
	updateDisplayOptions,
} from '../../../../utils/utilities';


const properties: INodeProperties[] = [
	{
		displayName: 'OrderId',
		name: 'orderId',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Symbol',
		name: 'symbol',
		type: 'string',
		default: '',
		placeholder: '格式: 现货BTC/USDT, usdt永续BTC/USDT:USDT,币本位永续ETH/USD:ETH',
		description: "格式,现货: BTC/USDT,usdt永续: BTC/USDT:USDT, 币本位永续: ETH/USD:ETH, 掉期合约: BTC/USDT:BTC-211225, 期权: BTC/USD:BTC-240927-40000-C",
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
		operation: ['fetchClosedOrder'],
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
			const exchange = exchanges.get(platform)
			const proxy = this.getNodeParameter('proxy', i) as string;
			exchanges.setProxy(exchange, proxy);
			exchanges.setKeys(exchange, credentials.apiKey as string, credentials.secret as string, credentials.password as string, credentials.uid as string)

			const symbol = (this.getNodeParameter('symbol', i) as string);
			const orderId = (this.getNodeParameter('orderId', i) as string).trim();
			const params = validateJSON(this.getNodeParameter('params', i) as string);

			// @ts-ignore
			const responseData = await exchange.fetchClosedOrder(orderId, symbol, params || {})

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
