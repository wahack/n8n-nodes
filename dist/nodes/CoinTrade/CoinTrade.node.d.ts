import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class CoinTrade implements INodeType {
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<import("n8n-workflow").INodeExecutionData[][]>;
}
