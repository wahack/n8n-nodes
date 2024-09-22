import ccxt from './custom';

class Exchanges {
	exchanges: Map<string, ccxt.Exchange>;
  constructor() {
    this.exchanges = new Map();
  }
  get(platformId: string) {
    let exchange = this.exchanges.get(platformId);
    if (!exchange) {
			// @ts-ignore
      exchange = new ccxt[platformId]();
			exchange!.options['maxRetriesOnFailure'] = 5 // if we get an error like the ones mentioned above we will retry up to three times per request
			exchange!.options['maxRetriesOnFailureDelay'] = 2000 // we will wait 1000ms (1s) between retries
      this.exchanges.set(platformId, exchange!);
    }
    return exchange!;
  }
  fetch() {
    return ccxt.exchanges;
  }
	setProxy (exchange: ccxt.Exchange, proxy: string) {
		if (proxy) {
			exchange.socksProxy = proxy;
		} else {
			exchange.socksProxy = proxy;
		}
	}
  setKeys(exchange: ccxt.Exchange, apiKey:string, secret:string, password?:string, uid?:string) {
    exchange.apiKey = apiKey || '';
    exchange.secret = secret || '';
    exchange.password = password || '';
    exchange.uid = uid || '';
  }
  clearKeys(exchange: ccxt.Exchange) {
    exchange.apiKey = '';
    exchange.secret = '';
    exchange.password = '';
    exchange.uid = '';
  }
}
const exchanges = new Exchanges();

export default exchanges;
