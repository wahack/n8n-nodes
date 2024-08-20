"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = router;
const n8n_workflow_1 = require("n8n-workflow");
const market = __importStar(require("./market/market.resource"));
const trade = __importStar(require("./trade/trade.resource"));
const fund = __importStar(require("./fund/fund.resource"));
async function router() {
    let returnData = [];
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    const coinTradeNodeData = {
        resource,
        operation,
    };
    try {
        switch (coinTradeNodeData.resource) {
            case 'market':
                returnData = await market[coinTradeNodeData.operation].execute.call(this);
                break;
            case 'trade':
                returnData = await trade[coinTradeNodeData.operation].execute.call(this);
                break;
            case 'fund':
                returnData = await fund[coinTradeNodeData.operation].execute.call(this);
                break;
            default:
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
        }
    }
    catch (error) {
        if (error.description &&
            error.description.includes('cannot accept the provided value')) {
            error.description = `${error.description}. Consider using 'Typecast' option`;
        }
        throw error;
    }
    return [returnData];
}
//# sourceMappingURL=router.js.map