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
        displayName: 'symbol',
        name: 'symbol',
        type: 'string',
        default: 'BTC/USDT',
        required: true,
    }, {
        displayName: 'isBuy',
        name: 'isBuy',
        type: 'boolean',
        default: true,
        required: false,
    },
    {
        displayName: 'type',
        name: 'type',
        type: 'options',
        default: 'market',
        required: false,
        options: [
            {
                name: 'market',
                value: "market"
            }, {
                name: 'limit',
                value: 'limit'
            }
        ]
    },
    {
        displayName: 'amount',
        name: 'amount',
        type: 'number',
        default: '',
        required: true,
    }, {
        displayName: 'price',
        name: 'price',
        type: "number",
        default: undefined,
        required: false
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
            const symbol = this.getNodeParameter('symbol', i);
            const isBuy = this.getNodeParameter('isBuy', i);
            const type = this.getNodeParameter('type', i);
            const amount = this.getNodeParameter('amount', i);
            const price = this.getNodeParameter('price', i);
            const responseData = await exchange.createOrder(symbol, type, isBuy ? 'buy' : 'sell', amount, price);
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