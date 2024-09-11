import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';

import exchanges from '../../helpers/exchanges';

import {
	updateDisplayOptions,
} from '../../../../utils/utilities';


const properties: INodeProperties[] = [
	{
		displayName: 'Symbol',
		name: 'symbol',
		type: 'string',
		default: '',
		placeholder: '格式: 现货BTC/USDT, usdt永续BTC/USDT:USDT,币本位永续ETH/USD:ETH',
		description: "格式,现货: BTC/USDT,usdt永续: BTC/USDT:USDT, 币本位永续: ETH/USD:ETH, 掉期合约: BTC/USDT:BTC-211225, 期权: BTC/USD:BTC-240927-40000-C",
		required: true,
	},{
		displayName: 'Side',
		name: 'side',
		type: 'options',
		default: 'buy',
		required: true,
		options: [
			{
				name: '买入',
				value: 'buy'
			}, {
				name: '卖出',
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
		options: [
			{
				name: '市场价',
				value: "market"
			}, {
				name: '限价',
				value: 'limit'
			}
		]
	},
	{
		displayName: '数量',
		name: 'quantity',
		type: 'number',
		default: undefined,
		required: true,
	},{
		displayName: '数量单位',
		name: 'quantityUnit',
		type: 'options',
		default: 'count',
		options: [
			{
				name: "币数量(个)",
				value: "count"
			}, {
				name: '金额(Usdt)',
				value: 'usdt'
			}
		]
	},{
		displayName: 'Price',
		name: 'price',
		type: "number",
		default: undefined,

		displayOptions: {
			show: {
				type: ['limit']
			}
		}
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

	const credentials = await this.getCredentials('coinTradeApi');


	for (let i = 0; i < length; i++) {
		try {
			const platform = this.getNodeParameter('platform', i) as string;
			const exchange = exchanges.get(platform)
			const proxy = this.getNodeParameter('proxy', i) as string;
			exchanges.setProxy(exchange, proxy);
			exchanges.setKeys(exchange, credentials.apiKey as string, credentials.secret as string, credentials.password as string, credentials.uid as string)

			const symbol = (this.getNodeParameter('symbol', i) as string).trim().toUpperCase();
			let side = this.getNodeParameter('side', i) as string;
			const type = this.getNodeParameter('type', i) as string;
			const quantity = this.getNodeParameter('quantity', i) as number;
			const quantityUnit = this.getNodeParameter('quantityUnit', i) as string;
			let price = type === 'limit' ? this.getNodeParameter('price', i) as number : undefined;

			let amount: number = 0;
			await exchange.loadMarkets();
			const market = exchange.market(symbol);

			if (platform === 'okx' || platform === 'gate') {
				if (market.contract) {
					// params.positionSide = positionSide;
					if (market['quote'] === 'USD') {//币本位
						let total = quantityUnit === 'usdt' ? quantity : quantity * ((await exchange.fetchTicker(symbol)).last || 0)
						amount = Math.round(total / (market['contractSize'] || 1)); //币本位,合约面值1张xx美元
					} else if (market['quote'] === 'USDT') {//u本位
						let count = quantityUnit === 'count' ? quantity : quantity / ((await exchange.fetchTicker(symbol)).last || 0);
						amount = Math.round(count / (market['contractSize'] || 1)); //u本位,合约面值1张多少个币
					}
				}
			} else if (platform === 'binance') {
				if (market.contract) {
					if (market['quote'] === 'USD') {
						let total = quantityUnit === 'usdt' ? quantity : quantity * ((await exchange.fetchTicker(symbol)).last || 0)
						amount = Math.round(total / market['contractSize']!); //币本位,合约面值1张xx美元
					}
				}
			} else if (platform === 'bybit') {

			} else if (platform === 'bitget') {
				if (market.contract) {
					side = side + '_single';
				} else { //现货
					if (type === 'market' && side === 'buy') {
						price = (await exchange.fetchTicker(symbol)).last
					}
				}
			} else {
				throw new Error('exchange not support')
			}


			if (!amount) amount = Number(exchange.amountToPrecision(symbol, quantityUnit === 'count' ? quantity : quantity / ((await exchange.fetchTicker(symbol)).last || 0)));


			const responseData = await exchange.createOrder(symbol, type, side, amount, price)

			exchanges.clearKeys(exchange);
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
