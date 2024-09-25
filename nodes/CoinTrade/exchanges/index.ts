import Binance from './binance';
import Bybit from './bybit';
import BaseExchange from './exchange.abstract';
const exchanges: Record<string, typeof BaseExchange> =  {
	binance: Binance,
	bybit: Bybit
}

export default exchanges;
