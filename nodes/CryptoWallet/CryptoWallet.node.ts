// import type { INodeTypeBaseDescription} from 'n8n-workflow';

import {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';

import * as generateMnemonic from './actions/generateMnemonic';
import * as getBalance from './actions/getBalance';
import * as createHDWallet from './actions/createHDWallet';
import * as transfer from './actions/transfer';
const actions: Record<string, (this: IExecuteFunctions) => Promise<any>> = {
	[generateMnemonic.ActionName]: generateMnemonic.execute,
	[getBalance.ActionName]: getBalance.execute,
	[createHDWallet.ActionName]: createHDWallet.execute,
	[transfer.ActionName]: transfer.execute
}


export class CryptoWallet implements INodeType {
	description: INodeTypeDescription = {
	displayName: 'CryptoWallet',
	name: 'cryptoWallet',
	icon: 'file:cryptowallet.svg',
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'consume the crypto exchange api',
	defaults: {
		name: 'CryptoWallet',
	},
	group: ['input', 'output'],
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Action',
			name: 'action',
			type: 'options',
			default: '',
			noDataExpression: false,
			options: [
				{
					name: generateMnemonic.ActionName,
					value: generateMnemonic.ActionName,
				},
				{
					name: getBalance.ActionName,
					value: getBalance.ActionName,
				},
				{
					name: createHDWallet.ActionName,
					value: createHDWallet.ActionName,
				},
				{
					name: transfer.ActionName,
					value: transfer.ActionName,
				}
			],
		},
		...generateMnemonic.description,
		...getBalance.description,
		...createHDWallet.description,
		...transfer.description
	]
	};

	async execute(this: IExecuteFunctions) {
		const ActionName = this.getNodeParameter('action', 0) as string;
		if (!ActionName || !actions[ActionName]) {
			throw new NodeOperationError(this.getNode(), 'No action provided');
		}
		return await actions[ActionName].call(this);
	}
}
