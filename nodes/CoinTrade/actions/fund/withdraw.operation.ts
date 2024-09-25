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
		displayName: '币种',
		name: 'coin',
		type: 'string',
		default: '',
		placeholder: 'BTC,USDT,ETH',
		required: true,
	},{
		displayName: '数量',
		name: 'amount',
		type: 'number',
		default: '',
		required: true,
	},
	{
		displayName: '地址',
		name: 'address',
		type: 'string',
		default: '',

	},
	{
		displayName: '网络',
		name: 'network',
		type: 'string',
		default: '',
		placeholder: "ERC20,TRC20,BEP20,BEP2",

	},{
		displayName: 'Tag',
		name: 'tag',
		type: "string",
		placeholder: "标签",
		default: '',
	}
];

const displayOptions = {
	show: {
		resource: ['fund'],
		operation: ['withdraw'],
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
			const proxy = this.getNodeParameter('proxy', i) as string;


			const coin = this.getNodeParameter('coin', i) as string;
			const address = this.getNodeParameter('address', i) as string;
			const amount = this.getNodeParameter('amount', i) as string;
			const network = this.getNodeParameter('network', i) as string;
			const tag = this.getNodeParameter('tag', i) as string;

			const responseData = await exchanges[platform].withdraw(proxy, credentials as any, coin, amount, address, tag, network)

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
