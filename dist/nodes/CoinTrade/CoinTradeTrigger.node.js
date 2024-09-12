"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinTradeTrigger = void 0;
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const n8n_workflow_1 = require("n8n-workflow");
const exchanges_1 = __importDefault(require("./helpers/exchanges"));
class CoinTradeTrigger {
    constructor() {
        this.description = {
            displayName: 'Coin Trade Trigger',
            name: 'coinTradeTrigger',
            icon: 'file:cointrade.svg',
            group: ['trigger'],
            version: 1,
            subtitle: '={{$parameter["event"]}}',
            description: 'Starts the workflow when  events occur',
            defaults: {
                name: 'Coin Trade Trigger',
            },
            inputs: [],
            outputs: ["main"],
            credentials: [
                {
                    name: 'coinTradeApi',
                    displayName: '交易所 api',
                    required: false
                }
            ],
            polling: true,
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
                    displayName: 'Event',
                    name: 'event',
                    type: 'options',
                    required: true,
                    default: 'tradeUpdated',
                    options: [
                        {
                            name: '订单成交',
                            value: 'tradeUpdated',
                        },
                    ],
                },
                {
                    displayName: '交易对',
                    name: 'symbol',
                    type: 'string',
                    default: '',
                    required: true
                },
                {
                    displayName: 'Limit',
                    name: 'limit',
                    type: 'number',
                    typeOptions: {
                        minValue: 1,
                    },
                    description: 'Max number of results to return',
                    default: 50
                },
            ],
        };
    }
    async poll() {
        const webhookData = this.getWorkflowStaticData('node');
        const poolTimes = this.getNodeParameter('pollTimes.item', []);
        const limit = this.getNodeParameter('limit', 20);
        const symbol = this.getNodeParameter('symbol', '');
        const platform = this.getNodeParameter('platform', '');
        const proxy = this.getNodeParameter('proxy', '');
        const credentials = await this.getCredentials('coinTradeApi');
        const now = (0, moment_timezone_1.default)().utc().format();
        const lastTimeChecked = webhookData.lastTimeChecked || now;
        const exchange = exchanges_1.default.get(platform);
        exchanges_1.default.setProxy(exchange, proxy);
        exchanges_1.default.setKeys(exchange, credentials.apiKey, credentials.secret, credentials.password, credentials.uid);
        if (poolTimes.length === 0) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Please set a poll time');
        }
        let trades;
        try {
            trades = await exchange.fetchMyTrades(symbol, Date.parse(lastTimeChecked), limit, {});
        }
        catch (e) {
            return null;
        }
        exchanges_1.default.clearKeys(exchange);
        webhookData.lastTimeChecked = now;
        if (Array.isArray(trades) && trades.length !== 0) {
            return [this.helpers.returnJsonArray({ trades })];
        }
        return null;
    }
}
exports.CoinTradeTrigger = CoinTradeTrigger;
//# sourceMappingURL=CoinTradeTrigger.node.js.map