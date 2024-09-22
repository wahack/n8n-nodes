import {
	INodeType,
	NodeConnectionType,
	INodeExecutionData,
	type IExecuteFunctions,
	type INodeTypeDescription,
	IHttpRequestOptions,
} from 'n8n-workflow';

function validateJSON(json: string | undefined): object {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = {};
	}
	return Object.keys(result).length ? result : undefined;
}

export class FormIoCustom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FormIoCustom',
		name: 'formIoCustom',
		icon: 'file:formiocustom.svg',
		group: ['input', 'output'],
		version: 1,
		description: 'Modify data based on instructions written in plain english',
		defaults: {
			name: 'FormIoCustom',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionType.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'formIoCustomApi',
				displayName: 'formIoCustom api',
				required: true
			}
		],
		properties: [
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
				default: 'GET',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'GET',
						value: 'GET'
					},
					{
						name: 'POST',
						value: 'POST'
					},
					{
						name: 'PUT',
						value: 'PUT'
					},
					{
						name: 'PATCH',
						value: 'PATCH'
					},
					{
						name: 'DELETE',
						value: 'DELETE'
					}
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
				default: '{}'
			}
		],
	};

	async execute(this: IExecuteFunctions) : Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('formIoCustomApi');
		const items = this.getInputData();
		const length = items.length;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < length; i++) {
			try {


				const path = this.getNodeParameter('path', i) as string;
				const method = this.getNodeParameter('method', i) as string;
				const data = validateJSON(this.getNodeParameter('data', i) as string);


				const options: IHttpRequestOptions = {
					// @ts-ignore
					method,
					headers: {
						Accept: 'application/json',
					},
					body: data,
					// @ts-ignore
					qs: method === 'GET' && data ? data: undefined,
					uri: credentials.host + path,
					json: true,
				};
				// @ts-ignore
				const responseData = await this.helpers.requestWithAuthentication.call(this,
					'formIoCustomApi',
					options)
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
		return [returnData]
	}
}
