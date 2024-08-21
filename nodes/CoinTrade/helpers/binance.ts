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
		httpsAgent: new SocksProxyAgent(proxy)
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
		httpsAgent: new SocksProxyAgent(proxy)
	})
	return res.data
}

export async function request (apiKey: string, secret: string, proxy: string,  path: string,method: string, data: any) {
	data.timestamp = new Date().getTime();
	data.recvWindow = 8000;
	const res =  await axios({
		url: host + path,
		method,
		headers: {
			'X-MBX-APIKEY': apiKey,
		},
		httpAgent: new SocksProxyAgent(proxy),
		httpsAgent: new SocksProxyAgent(proxy),
		timeout: 8000,
		data: method === 'get' ? null : {
			...data,
			signature: sign(data, secret)
		},
		params: method === 'get' ? {
			...data,
			signature: sign(data, secret)
		} : null,
	})
	return res.data
}




