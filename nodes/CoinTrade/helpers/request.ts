import exchanges from './exchanges';
import {request as bianRequest} from './binance'

export async function request (platform:string, apiKey: string, secret: string, password: string, proxy: string,  path: string,method: string, data: any) {
	if (platform === 'binance') {
		return await bianRequest(apiKey, secret, proxy, path, method, data);
	}
	const exchange = exchanges.get(platform);
	exchanges.setProxy(exchange, proxy);
	exchanges.setKeys(exchange, apiKey, secret, password);
	if (platform === 'bitget') {
		// path input example:  /api/spot/v1/account/assets
		// target path: spot/v1/account/assets

		const pathArr = path.split('/').filter(i => i);
		const res = await exchange.request(pathArr.slice(1).join('/'), ['private', pathArr[1]], method.toUpperCase(), data);
		exchanges.clearKeys(exchange);
		return res
	} else if (platform === 'gate') {
		// path input example: /futures/usdt/orders
		// target path: usdt/orders
		const pathArr = path.split('/').filter(i => i);
		const res = await exchange.request(pathArr.slice(1).join('/'), ['private', pathArr[0]], method.toUpperCase(), data);
		exchanges.clearKeys(exchange);
		return res;
	}

}
