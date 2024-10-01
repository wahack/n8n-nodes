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

export const ActionName = 'generateMnemonic';

const properties: INodeProperties[] = [
	{
		displayName: 'wordsLength',
		name: 'wordsLength',
		type: 'options',
		default: 12,
		description: 'The number of words in the mnemonic',
		options: [
			{
				name: '12',
				value: 12,
			},
			{
				name: '15',
				value: 15,
			},
			{
				name: '18',
				value: 18,
			},
			{
				name: '21',
				value: 21,
			},
			{
				name: '24',
				value: 24,
			},
		],
		required: true,
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
