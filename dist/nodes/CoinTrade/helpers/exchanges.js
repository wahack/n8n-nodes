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
const ccxt = __importStar(require("ccxt"));
class Exchanges {
    constructor() {
        this.exchanges = new Map();
    }
    get(platformId) {
        let exchange = this.exchanges.get(platformId);
        if (!exchange) {
            exchange = new ccxt[platformId]({
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            });
            this.exchanges.set(platformId, exchange);
        }
        return exchange;
    }
    fetch() {
        return ccxt.exchanges;
    }
    setProxy(exchange, proxy) {
        exchange.socksProxy = proxy;
    }
    setKeys(exchange, apiKey, secret, password, uid) {
        exchange.apiKey = apiKey || '';
        exchange.secret = secret || '';
        exchange.password = password || '';
        exchange.uid = uid || '';
    }
    clearKeys(exchange) {
        exchange.apiKey = '';
        exchange.secret = '';
        exchange.password = '';
        exchange.uid = '';
    }
}
const exchanges = new Exchanges();
exports.default = exchanges;
//# sourceMappingURL=exchanges.js.map