"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.description = void 0;
exports.execute = execute;
const binance_1 = require("../../helpers/binance");
const utilities_1 = require("../../../../utils/utilities");
function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = {};
    }
    return result;
}
const properties = [
    {
        displayName: 'path',
        name: 'path',
        type: 'string',
        default: '',
        required: true,
    },
    {
        displayName: 'method',
        name: 'method',
        type: 'options',
        default: 'get',
        options: [
            {
                name: "get",
                value: 'get'
            },
            {
                name: "post",
                value: 'post'
            },
            {
                name: "put",
                value: 'put'
            },
        ],
        required: true,
    },
    {
        displayName: 'data',
        name: 'data',
        type: 'json',
        typeOptions: {
            alwaysOpenEditWindow: true,
        },
        default: ''
    }
];
const displayOptions = {
    show: {
        resource: ['custom'],
        operation: ['customApi'],
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
            const path = this.getNodeParameter('path', i);
            const method = this.getNodeParameter('method', i);
            const data = validateJSON(this.getNodeParameter('data', i));
            const responseData = await (0, binance_1.request)(credentials.apiKey, credentials.secret, proxy, path, method, data);
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
//# sourceMappingURL=customApi.operation.js.map