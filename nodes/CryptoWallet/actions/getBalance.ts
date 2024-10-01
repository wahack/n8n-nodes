import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';


import {
	updateDisplayOptions,
} from '../../../utils/utilities';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { formatUnits } from 'viem';

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });


export const ActionName = 'getBalance';

const properties: INodeProperties[] = [
	{
		displayName: '地址',
		name: 'address',
		type: 'string',
		default: '',
		description: 'The wallet address to get the balance of',
	},
	{
		displayName: '网络',
		name: 'network',
		type: 'options',
		default: 'sui-mainnet',
		description: 'The network to get the balance of',
		options: [
			{
				name: 'sui-mainnet',
				value: 'sui-mainnet',
			}, {
				name: 'eth-mainnet',
				value: 'eth-mainnet',
			}
		]
	}
];

const displayOptions = {
	show: {
		action: [ActionName],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;


	for (let i = 0; i < length; i++) {
		try {

			const address = this.getNodeParameter('address', i) as string;

			const balance = await suiClient.getBalance({
				owner: address
		})



			const responseData = {
				// convert balance to decimal
				balance: formatUnits(BigInt(balance.totalBalance)	, 9)
			}

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

	return [returnData];
}
