import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import {request} from '../../helpers/request';

import {
	updateDisplayOptions,
} from '../../../../utils/utilities';

function validateJSON(json: string | undefined): object {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = {};
	}
	return result;
}
const properties: INodeProperties[] = [
	{
		displayName: 'Path',
		name: 'path',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get'
			},
			{
				name: 'Post',
				value: 'post'
			},
			{
				name: 'Put',
				value: 'put'
			},
		],
		required: true,
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: ''
	}
];

const displayOptions = {
	show: {
		resource: ['custom'],
		operation: ['customApi'],
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

			const path = this.getNodeParameter('path', i) as string;
			const method = this.getNodeParameter('method', i) as string;
			const data = validateJSON(this.getNodeParameter('data', i) as string);


			const responseData = await request(
				this.getNodeParameter('platform', i) as string,
				credentials.apiKey as string,
				credentials.secret as string,
				(credentials.password as string) || '',
				proxy,
				path,
				method,
				data
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
