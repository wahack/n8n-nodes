import axios from 'axios';
import crypto from 'node:crypto';
import qs from 'qs';
import { SocksProxyAgent } from 'socks-proxy-agent';

const host = 'https://api.binance.com';


function sign(data: any, secret: string) {
  return crypto.createHmac('sha256', secret).update(qs.stringify(data, { encode: false })).digest('hex');
}


export async function getRequest (apiKey: string, secret: string, proxy: string, path: string, data: any) {
	data.timestamp = new Date().getTime();
	const res =  await axios.get(host + path, {
		headers: {
			'X-MBX-APIKEY': apiKey,
		},
		params: {
			...data,
			signature: sign(data, secret)
		},
		httpAgent: new SocksProxyAgent(proxy),
		httpsAgent: new SocksProxyAgent(proxy),
		validateStatus: null
	})
	return res.data
}


export async function postRequest (apiKey: string, secret: string, proxy: string, path: string, data: any) {
	data.timestamp = new Date().getTime();
	const res =  await axios.post(host + path, {
		...data,
		signature: sign(data, secret)
	}, {
		headers: {
			'X-MBX-APIKEY': apiKey,
		},
		httpAgent: new SocksProxyAgent(proxy),
		httpsAgent: new SocksProxyAgent(proxy),
		validateStatus: null
	})
	return res.data
}

export async function request (apiKey: string, secret: string, proxy: string,  path: string,method: string, data: any = {}) {
	path = path.trim();
	const params = {
		...data
	}

	if (apiKey && secret) {
		data.timestamp = new Date().getTime();
		data.recvWindow = 10000;
		params.signature =  sign(data, secret)
	}

	const res =  await axios({
		url: path.startsWith('http') ? path :  host + path,
		method,
		responseType: 'json',
		headers: params.signature ? {
			'X-MBX-APIKEY': apiKey,
		} : {},
		httpAgent: new SocksProxyAgent(proxy),
		httpsAgent: new SocksProxyAgent(proxy),
		timeout: 10000,
		params,
		validateStatus: null
	})
	return res.data
}
