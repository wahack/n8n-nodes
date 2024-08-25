"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinTradeApi = void 0;
class CoinTradeApi {
    constructor() {
        this.name = 'coinTradeApi';
        this.displayName = 'CoinTrade API';
        this.properties = [
            {
                displayName: '交易所',
                name: 'platform',
                type: 'options',
                default: 'binance',
                options: [
                    {
                        name: 'binance',
                        value: 'binance'
                    },
                    {
                        name: 'bybit',
                        value: 'bybit'
                    }, {
                        name: 'okx',
                        value: 'okx'
                    }, {
                        name: 'bitget',
                        value: 'bitget'
                    }
                ]
            },
            {
                displayName: 'api key',
                name: 'apiKey',
                type: 'string',
                default: '',
                required: true,
                typeOptions: {
                    password: true,
                }
            },
            {
                displayName: 'api secret',
                name: 'secret',
                type: 'string',
                default: '',
                required: true,
                typeOptions: {
                    password: true,
                }
            },
            {
                displayName: 'api password',
                name: 'password',
                type: 'string',
                default: '',
                required: false,
                typeOptions: {
                    password: true,
                },
                displayOptions: {
                    show: {
                        platform: ['okx']
                    }
                }
            },
        ];
    }
}
exports.CoinTradeApi = CoinTradeApi;
//# sourceMappingURL=CoinTradeApi.credentials.js.map