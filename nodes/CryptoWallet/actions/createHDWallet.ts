import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {  toHex } from '@mysten/sui/utils';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { ethers } from 'ethers';

import {
	updateDisplayOptions,
} from '../../../utils/utilities';

export const ActionName = 'createHDWallet';

const properties: INodeProperties[] = [
	{
		displayName: '助记词',
		name: 'mnemonic',
		type: 'string',
		default: '',
		description: 'The mnemonic to create a wallet from',
	},
	{
		displayName: '算法',
		name: 'algorithm',
		type: 'options',
		default: 'secp256k1',
		description: 'The algorithm to use for the wallet',
		options: [
			{
				name: 'Secp256k1',
				value: 'secp256k1',
			}, {
				name: 'Ed25519',
				value: 'ed25519',
			}
		]
	},
	{
		displayName: '派生路径',
		name: 'path',
		type: 'string',
		default: "m/44\'/60\'/0\'/0/0",
		description: 'The path to derive the wallet from',
		hint: "派生路径 ___EVM___: m/44'/60'/0'/0/0 ___SUI___: m/44'/784'/0'/0'/0'",
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
			const mnemonic = this.getNodeParameter('mnemonic', i) as string;
			const algorithm = this.getNodeParameter('algorithm', i) as string;
			const path = this.getNodeParameter('path', i) as string;
			let secretKey: string;
			let publicKey: string;
			let address: string;
			if (algorithm === 'secp256k1') {
				const  wallet =  ethers.HDNodeWallet.fromPhrase(mnemonic, '', path);
				secretKey = wallet.privateKey;
				publicKey = wallet.publicKey;
				address = wallet.address;
			} else if (algorithm === 'ed25519') {
				const keypair = Ed25519Keypair.deriveKeypair(mnemonic, path);
				secretKey = '0x' + toHex(decodeSuiPrivateKey(keypair.getSecretKey()).secretKey);
				publicKey = '0x' + toHex(keypair.getPublicKey().toRawBytes());
				address = keypair.toSuiAddress();
			} else {
				throw new Error('Invalid algorithm');
			}

			const responseData = {
				secretKey,
				publicKey,
				address,
			};

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
