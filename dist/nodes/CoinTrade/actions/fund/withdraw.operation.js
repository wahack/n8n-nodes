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
        displayName: '币种',
        name: 'coin',
        type: 'string',
        default: '',
        placeholder: 'BTC,USDT,ETH',
        required: true,
    }, {
        displayName: '数量',
        name: 'amount',
        type: 'number',
        default: '',
        required: true,
    },
    {
        displayName: '地址',
        name: 'address',
        type: 'string',
        default: '',
    },
    {
        displayName: '网络',
        name: 'network',
        type: 'string',
        default: '',
        placeholder: "ERC20,TRC20,BEP20,BEP2",
    }, {
        displayName: 'Tag',
        name: 'tag',
        type: "string",
        placeholder: "标签",
        default: '',
    }
];
const displayOptions = {
    show: {
        resource: ['fund'],
        operation: ['withdraw'],
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
            const coin = this.getNodeParameter('coin', i);
            const address = this.getNodeParameter('address', i);
            const amount = this.getNodeParameter('amount', i);
            const network = this.getNodeParameter('network', i);
            const tag = this.getNodeParameter('tag', i);
            const responseData = await exchange.withdraw(coin, amount, address, tag, { network });
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
//# sourceMappingURL=withdraw.operation.js.map