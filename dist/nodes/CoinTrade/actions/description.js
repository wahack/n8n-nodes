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
exports.description = void 0;
const market = __importStar(require("./market/market.resource"));
const trade = __importStar(require("./trade/trade.resource"));
const fund = __importStar(require("./fund/fund.resource"));
const custom = __importStar(require("./custom/custom.resource"));
exports.description = {
    displayName: 'Coin Trade',
    name: 'coinTrade',
    icon: 'file:cointrade.svg',
    version: 1,
    subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
    description: 'consume the crypto exchange api',
    defaults: {
        name: 'Coin Trade',
    },
    group: ['input', 'output'],
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
        {
            name: 'coinTradeApi',
            displayName: '交易所 api',
            required: false,
            displayOptions: {
                show: {
                    resource: ['trade', 'fund', 'custom'],
                },
            },
        }
    ],
    properties: [
        {
            displayName: '交易所',
            name: 'platform',
            type: 'options',
            noDataExpression: true,
            options: [
                {
                    name: 'Binance',
                    value: 'binance',
                }, {
                    name: 'Bybit',
                    value: 'bybit',
                }, {
                    name: 'Okx',
                    value: 'okx',
                },
                {
                    name: 'Bitget',
                    value: 'bitget',
                },
                {
                    name: 'Gate',
                    value: 'gate',
                }
            ],
            default: 'binance',
        },
        {
            displayName: '代理',
            name: 'proxy',
            type: 'string',
            default: '',
            placeholder: 'e.g. socks://user:password@ip:port',
        },
        {
            displayName: 'Resource',
            name: 'resource',
            type: 'options',
            noDataExpression: true,
            options: [
                {
                    name: 'Market',
                    value: 'market',
                }, {
                    name: 'Trade',
                    value: 'trade'
                },
                {
                    name: 'Fund',
                    value: 'fund'
                },
                {
                    name: 'Custom',
                    value: 'custom'
                }
            ],
            default: 'market',
        },
        ...market.description,
        ...trade.description,
        ...fund.description,
        ...custom.description
    ],
};
//# sourceMappingURL=description.js.map