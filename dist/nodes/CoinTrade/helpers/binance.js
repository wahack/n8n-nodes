"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequest = getRequest;
exports.postRequest = postRequest;
const axios_1 = __importDefault(require("axios"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const qs_1 = __importDefault(require("qs"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
const host = 'https://api.binance.com';
function sign(data, secret) {
    return node_crypto_1.default.createHmac('sha256', secret).update(qs_1.default.stringify(data, { encode: false })).digest('hex');
}
async function getRequest(apiKey, secret, proxy, path, data) {
    data.timestamp = new Date().getTime();
    const res = await axios_1.default.get(host + path, {
        headers: {
            'X-MBX-APIKEY': apiKey,
        },
        params: {
            ...data,
            signature: sign(data, secret)
        },
        httpAgent: new socks_proxy_agent_1.SocksProxyAgent(proxy),
        httpsAgent: new socks_proxy_agent_1.SocksProxyAgent(proxy)
    });
    return res.data;
}
async function postRequest(apiKey, secret, proxy, path, data) {
    data.timestamp = new Date().getTime();
    const res = await axios_1.default.post(host + path, {
        ...data,
        signature: sign(data, secret)
    }, {
        headers: {
            'X-MBX-APIKEY': apiKey,
        },
        httpAgent: new socks_proxy_agent_1.SocksProxyAgent(proxy),
        httpsAgent: new socks_proxy_agent_1.SocksProxyAgent(proxy)
    });
    return res.data;
}
//# sourceMappingURL=binance.js.map