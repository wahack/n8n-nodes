import {
	INodeType,
	NodeConnectionType,
	INodeExecutionData,
	type IExecuteFunctions,
	type INodeTypeDescription,

} from 'n8n-workflow';

import * as technicalindicators from 'technicalindicators'
import {get} from 'radash'


function validateJSON(json: string | undefined): object {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = {};
	}
	return Object.keys(result).length ? result : undefined;
}

export class TaIndicators implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TaIndicators',
		name: 'taIndicators',
		icon: 'file:taIndicators.svg',
		group: ['input', 'output'],
		version: 1,
		description: 'A javascript technical indicators written in typescript.',
		defaults: {
			name: 'taIndicators',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionType.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'MethodPath',
				name: 'methodPath',
				type: 'string',
				default: '',
				description: 'The method path of the technical indicator. support dot notation.',
				required: true,
			},
			{
				displayName: 'IndicatorParams',
				name: 'params',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '{}'
			}
		],
	};

	async execute(this: IExecuteFunctions) : Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < length; i++) {
			try {


				const methodPath = (this.getNodeParameter('methodPath', i) as string).trim();
				const data = validateJSON(this.getNodeParameter('params', i) as string);


				// @ts-ignore
				const responseData = get(technicalindicators, methodPath)(data)
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
