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
        default: 'BTC/USDT',
        required: true,
    }
];
const displayOptions = {
    show: {
        resource: ['market'],
        operation: ['fetchTicker'],
    },
};
exports.description = (0, utilities_1.updateDisplayOptions)(displayOptions, properties);
async function execute() {
    const items = this.getInputData();
    const returnData = [];
    const length = items.length;
    for (let i = 0; i < length; i++) {
        try {
            const platform = this.getNodeParameter('platform', i);
            const exchange = exchanges_1.default.get(platform);
            const proxy = this.getNodeParameter('proxy', i);
            exchanges_1.default.setProxy(exchange, proxy);
            const symbol = this.getNodeParameter('symbol', i);
            const responseData = await exchange.fetchTicker(symbol);
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
//# sourceMappingURL=fetchTicker.operation.js.map