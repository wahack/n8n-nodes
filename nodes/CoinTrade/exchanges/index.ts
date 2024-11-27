import Binance from './binance';
import Bybit from './bybit';
import Bluefin from './bluefin';
import BaseExchange from './exchange.abstract';
import Kucoin from './kucoin';
import Bitget from './bitget';
import Gate from './gate';
import Polymarket from './polymarket';
import Okx from './okx';
const exchanges: Record<string, typeof BaseExchange> =  {
	binance: Binance,
	bybit: Bybit,
	bluefin: Bluefin,
	kucoin: Kucoin,
	bitget: Bitget,
	gate: Gate,
	polymarket: Polymarket,
	okx: Okx
}

export default exchanges;
