import type {
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { BabelbeezCredentials } from './types';

type BabelbeezApiContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions;

export const BABELBEEZ_CREDENTIAL_TYPE = 'babelbeezApi';
export const BABELBEEZ_API_BASE_URL = 'https://api.babelbeez.com';

export async function getBabelbeezCredentials(
	context: BabelbeezApiContext,
): Promise<BabelbeezCredentials> {
	const credentials = await context.getCredentials<BabelbeezCredentials>(BABELBEEZ_CREDENTIAL_TYPE);

	return {
		apiKey: credentials.apiKey,
	};
}

export async function babelbeezApiRequest<T>(
	context: BabelbeezApiContext,
	method: IHttpRequestMethods,
	endpoint: string,
	options: Partial<IHttpRequestOptions> = {},
): Promise<T> {
	const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

	const requestOptions: IHttpRequestOptions = {
		method,
		url: `${BABELBEEZ_API_BASE_URL}${normalizedEndpoint}`,
		json: true,
		...options,
		headers: {
			Accept: 'application/json',
			...(options.headers ?? {}),
		},
	};

	try {
		return (await context.helpers.httpRequestWithAuthentication.call(
			context,
			BABELBEEZ_CREDENTIAL_TYPE,
			requestOptions,
		)) as T;
	} catch (error) {
		throw new NodeApiError(context.getNode(), error as JsonObject, {
			message: 'Babelbeez API request failed',
			description: 'Check your Babelbeez credentials and voice agent configuration, then try again.',
		});
	}
}