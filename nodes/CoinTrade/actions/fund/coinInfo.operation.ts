import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import {getRequest} from '../../exchanges/binance';

import {
	updateDisplayOptions,
} from '../../../../utils/utilities';


const properties: INodeProperties[] = [
	{
		displayName: '币种',
		name: 'coin',
		type: 'string',
		default: '',
		placeholder: 'BTC,USDT,ETH',
		required: true,
	}
];

const displayOptions = {
	show: {
		resource: ['fund'],
		operation: ['coinInfo'],
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

			const proxy = this.getNodeParameter('proxy', i) as string;

			const coin = this.getNodeParameter('coin', i) as string;


			const responseData = await getRequest(
				credentials.apiKey as string,
				credentials.secret as string,
				proxy,
				'/sapi/v1/capital/config/getall',
				{}
			)

			// @ts-ignore
			const coinInfo = responseData.find(i => i.coin === coin.toUpperCase())
			const networks = {networkList: coinInfo.networkList};
			const executionData = this.helpers.constructExecutionMetaData(
				// wrapData(responseData as IDataObject[]),
				// @ts-ignore
				this.helpers.returnJsonArray(networks as IDataObject),

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
