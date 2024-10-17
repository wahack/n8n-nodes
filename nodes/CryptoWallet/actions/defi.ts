import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';


import {
	updateDisplayOptions,
} from '../../../utils/utilities';

export const ActionName = 'defi';

const properties: INodeProperties[] = [
	{
		displayName: '钱包',
		name: 'wallet',
		type: 'string',
		default: '',
		description: 'The wallet to operate',
	},
	{
		displayName: '网络',
		name: 'network',
		type: 'options',
		default: 'sui-mainnet',
		description: 'The network of the wallet',
		options: [
			{
				name: 'sui-mainnet',
				value: 'sui-mainnet',
			}, {
				name: 'eth-mainnet',
				value: 'eth-mainnet',
			}
		]
	},
	{
		displayName: '协议',
		name: 'protocol',
		type: 'options',
		default: 'cetus',
		description: 'The protocol of the wallet',
		options: [
			{
				name: 'UniswapV4',
				value: 'uniswapv4',
			}, {
				name: 'Cetus',
				value: 'cetus',
			}
		]
	},
	{
		displayName: '操作',
		name: 'operation',
		type: 'options',
		default: 'swap',
		// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
		noDataExpression: false,
		description: 'The operation of the protocol',
		options: [
			{
				name: 'Swap',
				value: 'swap',
			}, {
				name: 'Add Liquidity',
				value: 'addLiquidity',
			}, {
				name: 'Remove Liquidity',
				value: 'removeLiquidity',
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

			const privateKey = this.getNodeParameter('wallet', i) as string;
			const network = this.getNodeParameter('network', i) as string;
			const protocol = this.getNodeParameter('protocol', i) as string;

			let responseData: IDataObject = {};

			if (protocol === 'uniswapv4') {
				responseData = {
					address: privateKey,
					network: network,
					protocol: protocol,
				}
			} else if (protocol === 'cetus') {
				responseData = {
					address: privateKey,
					network: network,
					protocol: protocol,
				}
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
