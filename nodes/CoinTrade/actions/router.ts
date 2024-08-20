import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { CoinTradeType } from './node.type';

import * as market from './market/market.resource';
import * as trade from './trade/trade.resource';
import * as fund from './fund/fund.resource';


export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	// const items = this.getInputData();
	const resource = this.getNodeParameter<CoinTradeType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const coinTradeNodeData = {
		resource,
		operation,
	} as CoinTradeType;

	try {
		switch (coinTradeNodeData.resource) {
			case 'market':
				returnData = await market[coinTradeNodeData.operation].execute.call(
					this
				);
				break;
			case 'trade':
				returnData = await trade[coinTradeNodeData.operation].execute.call(
					this
				);
				break;
			case 'fund':
				returnData = await fund[coinTradeNodeData.operation].execute.call(
					this
				);
				break;
			default:
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
		}
	} catch (error) {
		if (
			error.description &&
			(error.description as string).includes('cannot accept the provided value')
		) {
			error.description = `${error.description}. Consider using 'Typecast' option`;
		}
		throw error;
	}

	return [returnData];
}
