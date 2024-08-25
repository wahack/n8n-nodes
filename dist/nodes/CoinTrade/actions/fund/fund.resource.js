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
exports.description = exports.coinInfo = exports.withdraw = void 0;
const withdraw = __importStar(require("./withdraw.operation"));
exports.withdraw = withdraw;
const coinInfo = __importStar(require("./coinInfo.operation"));
exports.coinInfo = coinInfo;
exports.description = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
            {
                name: 'Withdraw',
                value: 'withdraw',
                description: 'Withdraw coin on chain',
                action: 'Withdraw fund',
            },
            {
                name: 'coinInfo',
                value: 'coinInfo',
                displayOptions: {
                    show: {
                        platform: ['binance']
                    }
                },
                description: 'Get information of coins (available for deposit and withdraw) for user',
                action: 'Get coin info',
            }
        ],
        default: 'withdraw',
        displayOptions: {
            show: {
                resource: ['fund'],
            },
        },
    },
    ...withdraw.description,
    ...coinInfo.description,
];
//# sourceMappingURL=fund.resource.js.map