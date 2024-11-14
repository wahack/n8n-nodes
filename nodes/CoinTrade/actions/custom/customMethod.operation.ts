import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import exchangesV2 from '../../exchanges';

import {
	updateDisplayOptions,
} from '../../../../utils/utilities';
import { ApiKeys } from '../../exchanges/types';

function validateJSON(json: string | undefined): object {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = [];
	}
	return result;
}
const properties: INodeProperties[] = [
	{
		displayName: 'Method',
		name: 'method',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '[]'
	}
];

const displayOptions = {
	show: {
		resource: ['custom'],
		operation: ['customMethod'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;

	let credentials
	try {
		// @ts-ignore
		credentials = await this.getCredentials('coinTradeApi') || {};
	} catch (e) {

	}

	for (let i = 0; i < length; i++) {
		try {

			const proxy = this.getNodeParameter('proxy', i) as string;

			const method = this.getNodeParameter('method', i) as string;
			const data = validateJSON(this.getNodeParameter('data', i) as string);


			const responseData = await exchangesV2[this.getNodeParameter('platform', i) as string].customMethodCall(
				proxy,
				credentials as ApiKeys,
				method,
				data as any
			)

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
