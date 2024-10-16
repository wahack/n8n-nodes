import Binance from './binance';
import Bybit from './bybit';
import Bluefin from './bluefin';
import BaseExchange from './exchange.abstract';
import Kucoin from './kucoin';
import Bitget from './bitget';
import Gate from './gate';
const exchanges: Record<string, typeof BaseExchange> =  {
	binance: Binance,
	bybit: Bybit,
	bluefin: Bluefin,
	kucoin: Kucoin,
	bitget: Bitget,
	gate: Gate
}

export default exchanges;
