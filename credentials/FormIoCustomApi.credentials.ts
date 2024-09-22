import axios from 'axios';
import {
	ICredentialType,
	INodeProperties,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	IHttpRequestOptions

} from 'n8n-workflow';

const jwtCached: Map<string, {jwt: string, expireAt: number}> = new Map();

export class FormIoCustomApi implements ICredentialType {
	name = 'formIoCustomApi';
	displayName = 'FormIoCustom API';
	// documentationUrl = '<your-docs-url>';
	properties: INodeProperties[] = [
		{
			displayName: 'host',
			name: 'host',
			type: 'string',
			default: '',
			required: true
		},
		{
			displayName: 'login email',
			name: 'email',
			type: 'string',
			default: '',
			required: true
		},

		{
			displayName: 'login password',
			name: 'password',
			type: 'string',
			default: '',
			required: false,
			typeOptions: {
				password: true,
			}
		}
	];

	async authenticate (credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		const key = `${credentials.emai}${credentials.password}`
		const obj = jwtCached.get(key);
		if (requestOptions.baseURL?.includes('user/login')) return requestOptions;
		if (obj && obj.expireAt > new Date().getTime()) {
			requestOptions.headers = requestOptions.headers || {};
			requestOptions.headers['x-jwt-token'] = obj.jwt
		} else {
			try {
				const res = await axios.post( `${
					credentials.host
				}/user/login`, {
					data: {
						"email": credentials.email,
						"password": credentials.password
					}
				})
				requestOptions.headers = requestOptions.headers || {};
				requestOptions.headers['x-jwt-token'] = res.headers['x-jwt-token']
				jwtCached.set(key, {
					jwt: res.headers['x-jwt-token'],
					expireAt: new Date().getTime() + 4 * 60 * 60 * 1000
				})
			} catch (e) {
			}
		}
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}/current',
			timeout: 5000
		}
	};
}
