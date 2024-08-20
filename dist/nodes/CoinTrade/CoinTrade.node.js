"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinTrade = void 0;
const description_1 = require("./actions/description");
const router_1 = require("./actions/router");
class CoinTrade {
    constructor() {
        this.description = {
            ...description_1.description
        };
    }
    async execute() {
        return await router_1.router.call(this);
    }
}
exports.CoinTrade = CoinTrade;
//# sourceMappingURL=CoinTrade.node.js.map