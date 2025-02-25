import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import exchanges from '../../exchanges';

import {
	updateDisplayOptions,
} from '../../../../utils/utilities';
function validateJSON(json: string | undefined): object {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = {};
	}
	return result;
}

const properties: INodeProperties[] = [
	{
		displayName: 'Symbol',
		name: 'symbol',
		type: 'string',
		default: '',
		placeholder: 'Format: Spot BTC/USDT, USDT Perpetual BTC/USDT:USDT, Coin-Margined Perpetual ETH/USD:ETH',
		description: "Format: Spot BTC/USDT, USDT Perpetual BTC/USDT:USDT, Coin-Margined Perpetual ETH/USD:ETH",
		required: true,
	},{
		displayName: 'Side',
		name: 'side',
		type: 'options',
		default: 'buy',
		required: true,
		options: [
			{
				name: 'Buy',
				value: 'buy'
			}, {
				name: 'Sell',
				value: 'sell'
			}
		]
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: 'market',
		required: true,
		description: 'Order type',
		options: [
			{
				name: 'Market',
				value: "market"
			}, {
				name: 'Limit',
				value: 'limit'
			}
		]
	},
	{
		displayName: 'Quantity',
		name: 'quantity',
		type: 'number',
		description: 'Generally represents the coin quantity. Special cases: for Bitget/Gate spot market buy orders, the quantity is measured in USDT; for Gate futures trading, the quantity is measured in contracts.',
		default: undefined,
		required: true,
	},
	// {
	// 	displayName: 'QuantityUnit',
	// 	name: 'quantityUnit',
	// 	type: 'options',
	// 	default: 'count',
	// 	description: 'Generally represents the coin quantity. Special cases: for Bitget/Gate spot market buy orders, the quantity is measured in USDT; for Gate futures trading, the quantity is measured in contracts.',
	// 	options: [
	// 		{
	// 			name: "Count",
	// 			value: "count"
	// 		}
	// 		// , {
	// 		// 	name: '金额(Usdt)',
	// 		// 	value: 'usdt'
	// 		// }
	// 	]
	// },
	{
		displayName: 'Price',
		name: 'price',
		type: "number",
		default: undefined,
		displayOptions: {
			show: {
				type: ['limit']
			}
		}
	},
	{
		displayName: 'Params',
		name: 'params',
		type: 'json',
		description: 'Additional parameters passed to request body, if needed',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '{}'
	}
];

const displayOptions = {
	show: {
		resource: ['trade'],
		operation: ['createOrder'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;

	let credentials;

	try {
		credentials = await this.getCredentials('coinTradeApi');
		if (!credentials.apiKey || !((credentials.apiKey as string).trim())) credentials = undefined;

	} catch (e) {

	}


	for (let i = 0; i < length; i++) {
		try {
			const platform = this.getNodeParameter('platform', i) as string;
			const proxy = this.getNodeParameter('proxy', i) as string;
			const params = validateJSON(this.getNodeParameter('params', i) as string);

			const symbol = (this.getNodeParameter('symbol', i) as string).trim().toUpperCase();
			let side = this.getNodeParameter('side', i) as string;
			const type = this.getNodeParameter('type', i) as string;
			const amount = this.getNodeParameter('quantity', i) as number;
			// const quantityUnit = this.getNodeParameter('quantityUnit', i) as string;
			let price = type === 'limit' ? this.getNodeParameter('price', i) as number : undefined;

			// let amount: number = 0;


			// if (platform === 'okx' || platform === 'gate') {
			// 	await exchange.loadMarkets();
			// const market = exchange.market(symbol);
			// 	if (market.contract) {
			// 		// params.positionSide = positionSide;
			// 		if (market['quote'] === 'USD') {//币本位
			// 			let total = quantityUnit === 'usdt' ? quantity : quantity * ((await exchange.fetchTicker(symbol)).last || 0)
			// 			amount = Math.round(total / (market['contractSize'] || 1)); //币本位,合约面值1张xx美元
			// 		} else if (market['quote'] === 'USDT') {//u本位
			// 			let count = quantityUnit === 'count' ? quantity : quantity / ((await exchange.fetchTicker(symbol)).last || 0);
			// 			amount = Math.round(count / (market['contractSize'] || 1)); //u本位,合约面值1张多少个币
			// 		}
			// 	}
			// } else if (platform === 'binance') {
			// 	await exchange.loadMarkets();
			// 	const market = exchange.market(symbol);
			// 	if (market.contract) {
			// 		if (market['quote'] === 'USD') {
			// 			let total = quantityUnit === 'usdt' ? quantity : quantity * ((await exchange.fetchTicker(symbol)).last || 0)
			// 			amount = Math.round(total / market['contractSize']!); //币本位,合约面值1张xx美元
			// 		}
			// 	}
			// } else if (platform === 'bybit') {

			// } else if (platform === 'bitget') {
			// 	await exchange.loadMarkets();
			// 	const market = exchange.market(symbol);
			// 	if (market.contract) {
			// 		// side = side + '_single';
			// 	} else { //现货
			// 		if (type === 'market' && side === 'buy') {
			// 			price = (await exchange.fetchTicker(symbol)).last
			// 		}
			// 	}
			// }


			// if (!amount) amount = Number(exchange.amountToPrecision(symbol, quantityUnit === 'count' ? quantity : new BigNumber(quantity).dividedBy((await exchange.fetchTicker(symbol)).last || 0).toNumber()));


			const responseData = await exchanges[platform].createOrder(proxy, credentials as any, symbol, type, side, amount, price as number, { ...params})

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

	return returnData;
}
