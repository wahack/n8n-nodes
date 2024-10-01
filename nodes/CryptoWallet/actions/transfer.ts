import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';
import { generateMnemonic, wordlists } from 'bip39';


import {
	updateDisplayOptions,
} from '../../../utils/utilities';

export const ActionName = 'transfer';

const properties: INodeProperties[] = [
	{
		displayName: '钱包',
		name: 'wallet',
		type: 'string',
		default: '',
		description: 'The wallet to transfer from',
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
				name: 'testnet',
				value: 'testnet',
			}
		]
	},
	{
		displayName: '接收地址',
		name: 'to',
		type: 'string',
		default: '',
		description: 'The address to transfer to',
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

			const wordsLength = this.getNodeParameter('wordsLength', i) as number;

			const wordLenMap = new Map([
				[12, 128],
				[15, 160],
				[18, 192],
				[21, 224],
				[24, 256]
			]);
			const responseData = {
				mnemonic: generateMnemonic(wordLenMap.get(wordsLength), undefined, wordlists.english)
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
