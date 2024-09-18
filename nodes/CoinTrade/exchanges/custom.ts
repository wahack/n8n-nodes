import * as ccxt from 'ccxt';
import bluefin from './bluefin';

Object.assign(ccxt.exchanges, {
	bluefin
})
Object.assign(ccxt, {
	bluefin
})

export default ccxt;
