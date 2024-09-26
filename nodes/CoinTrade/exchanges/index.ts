import Binance from './binance';
import Bybit from './bybit';
import Bluefin from './bluefin';
import BaseExchange from './exchange.abstract';
const exchanges: Record<string, typeof BaseExchange> =  {
	binance: Binance,
	bybit: Bybit,
	bluefin: Bluefin
}

export default exchanges;
