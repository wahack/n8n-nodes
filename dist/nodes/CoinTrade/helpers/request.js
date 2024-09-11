"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = request;
const exchanges_1 = __importDefault(require("./exchanges"));
const binance_1 = require("./binance");
async function request(platform, apiKey, secret, password, proxy, path, method, data) {
    if (platform === 'binance') {
        return await (0, binance_1.request)(apiKey, secret, proxy, path, method, data);
    }
    const exchange = exchanges_1.default.get(platform);
    exchanges_1.default.setProxy(exchange, proxy);
    exchanges_1.default.setKeys(exchange, apiKey, secret, password);
    if (platform === 'bitget') {
        const pathArr = path.split('/').filter(i => i);
        const res = await exchange.request(pathArr.slice(1).join('/'), ['private', pathArr[1]], method.toUpperCase(), data);
        exchanges_1.default.clearKeys(exchange);
        return res;
    }
    else if (platform === 'gate') {
        const pathArr = path.split('/').filter(i => i);
        const res = await exchange.request(pathArr.slice(1).join('/'), ['private', pathArr[0]], method.toUpperCase(), data);
        exchanges_1.default.clearKeys(exchange);
        return res;
    }
}
//# sourceMappingURL=request.js.map