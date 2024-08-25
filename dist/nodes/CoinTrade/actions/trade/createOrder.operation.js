"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.description = void 0;
exports.execute = execute;
const exchanges_1 = __importDefault(require("../../helpers/exchanges"));
const utilities_1 = require("../../../../utils/utilities");
const properties = [
    {
        displayName: 'Symbol',
        name: 'symbol',
        type: 'string',
        default: '',
        placeholder: '格式: 现货BTC/USDT, usdt永续BTC/USDT:USDT,币本位永续ETH/USDT:ETH',
        description: "格式,现货: BTC/USDT,usdt永续: BTC/USDT:USDT, 币本位永续: ETH/USDT:ETH, 掉期合约: BTC/USDT:BTC-211225, 期权: BTC/USD:BTC-240927-40000-C",
        required: true,
    }, {
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
    }, {
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
    }, {
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
exports.description = (0, utilities_1.updateDisplayOptions)(displayOptions, properties);
async function execute() {
    const items = this.getInputData();
    const returnData = [];
    const length = items.length;
    const credentials = await this.getCredentials('coinTradeApi');
    for (let i = 0; i < length; i++) {
        try {
            const platform = this.getNodeParameter('platform', i);
            const exchange = exchanges_1.default.get(platform);
            const proxy = this.getNodeParameter('proxy', i);
            exchanges_1.default.setProxy(exchange, proxy);
            exchanges_1.default.setKeys(exchange, credentials.apiKey, credentials.secret, credentials.password, credentials.uid);
            const symbol = this.getNodeParameter('symbol', i).toUpperCase();
            let side = this.getNodeParameter('side', i);
            const type = this.getNodeParameter('type', i);
            const quantity = this.getNodeParameter('quantity', i);
            const quantityUnit = this.getNodeParameter('quantityUnit', i);
            const price = type === 'limit' ? this.getNodeParameter('price', i) : undefined;
            let amount = 0;
            await exchange.loadMarkets();
            const market = exchange.market(symbol);
            if (platform === 'okx') {
                if (market.contract) {
                    if (market['quote'] === 'USD') {
                        let total = quantityUnit === 'usdt' ? quantity : quantity * ((await exchange.fetchTicker(symbol)).last || 0);
                        amount = Math.round(total / market['contractSize']);
                    }
                    else if (market['quote'] === 'USDT') {
                        let count = quantityUnit === 'count' ? quantity : quantity / ((await exchange.fetchTicker(symbol)).last || 0);
                        amount = Math.round(count / market['contractSize']);
                    }
                }
            }
            else if (platform === 'binance') {
                if (market.contract) {
                    if (market['quote'] === 'USD') {
                        let total = quantityUnit === 'usdt' ? quantity : quantity * ((await exchange.fetchTicker(symbol)).last || 0);
                        amount = Math.round(total / market['contractSize']);
                    }
                }
            }
            else if (platform === 'bybit') {
            }
            else if (platform === 'bitget') {
                if (market.contract) {
                    side = side + '_single';
                }
            }
            else {
                throw new Error('exchange not support');
            }
            if (!amount)
                amount = Number(exchange.amountToPrecision(symbol, quantityUnit === 'count' ? quantity : quantity / ((await exchange.fetchTicker(symbol)).last || 0)));
            const responseData = await exchange.createOrder(symbol, type, side, amount, price);
            exchanges_1.default.clearKeys(exchange);
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            if (this.continueOnFail(error)) {
                returnData.push({ json: { error: error.message } });
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=createOrder.operation.js.map