import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	market: 'fetchTicker' | 'fetchOrderBook';
	trade: 'createOrder',
	fund: 'withdraw'
	// base: 'getMany' | 'getSchema';
};

export type CoinTradeType = AllEntities<NodeMap>;
