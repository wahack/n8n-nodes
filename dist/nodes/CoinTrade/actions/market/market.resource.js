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
exports.description = exports.fetchOrderBook = exports.fetchTicker = void 0;
const fetchTicker = __importStar(require("./fetchTicker.operation"));
exports.fetchTicker = fetchTicker;
const fetchOrderBook = __importStar(require("./fetchOrderBook.operation"));
exports.fetchOrderBook = fetchOrderBook;
exports.description = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
            {
                name: 'fetch ticker',
                value: 'fetchTicker',
                description: 'Fetch latest ticker data by trading symbol.',
                action: 'fetch ticker',
            },
            {
                name: 'fetch order book',
                value: 'fetchOrderBook',
                description: 'Fetch L2/L3 order book for a particular market trading symbol.',
                action: 'fetch order book',
            },
        ],
        default: 'fetchTicker',
        displayOptions: {
            show: {
                resource: ['market'],
            },
        },
    },
    ...fetchTicker.description,
    ...fetchOrderBook.description
];
//# sourceMappingURL=market.resource.js.map