import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { BABELBEEZ_API_BASE_URL } from '../nodes/shared/api';

export class BabelbeezApi implements ICredentialType {
	name = 'babelbeezApi';

	displayName = 'Babelbeez API';

	icon = 'file:../nodes/BabelbeezTrigger/babelbeez-logo-60x60.png' as const;

	documentationUrl = 'https://github.com/fastfret888/n8n-nodes-babelbeez#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Babelbeez embed/API key used to authenticate native n8n requests',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: BABELBEEZ_API_BASE_URL,
			method: 'GET',
			url: '/api/v1/integrations/n8n/me',
		},
	};
}