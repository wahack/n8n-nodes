import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	market: 'fetchTicker' | 'fetchOrderBook';
	trade: 'createOrder' | 'fetchOrder' | 'cancelOrder' | 'cancelAllOrders',
	fund: 'withdraw',
	custom: 'customApi'
	// base: 'getMany' | 'getSchema';
};

export type CoinTradeType = AllEntities<NodeMap>;
