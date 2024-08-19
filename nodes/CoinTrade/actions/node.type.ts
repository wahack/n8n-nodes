import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	market: 'fetchTicker' | 'fetchOrderBook';
	trade: 'createOrder'
	// base: 'getMany' | 'getSchema';
};

export type CoinTradeType = AllEntities<NodeMap>;
