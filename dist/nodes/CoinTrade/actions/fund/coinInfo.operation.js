"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.description = void 0;
exports.execute = execute;
const binance_1 = require("../../helpers/binance");
const utilities_1 = require("../../../../utils/utilities");
const properties = [
    {
        displayName: '币种',
        name: 'coin',
        type: 'string',
        default: '',
        placeholder: 'BTC,USDT,ETH',
        required: true,
    }
];
const displayOptions = {
    show: {
        resource: ['fund'],
        operation: ['coinInfo'],
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
            const proxy = this.getNodeParameter('proxy', i);
            const coin = this.getNodeParameter('coin', i);
            const responseData = await (0, binance_1.getRequest)(credentials.apiKey, credentials.secret, proxy, '/sapi/v1/capital/config/getall', {});
            const coinInfo = responseData.find(i => i.coin === coin.toUpperCase());
            const networks = { networkList: coinInfo.networkList };
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(networks), { itemData: { item: i } });
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
//# sourceMappingURL=coinInfo.operation.js.map