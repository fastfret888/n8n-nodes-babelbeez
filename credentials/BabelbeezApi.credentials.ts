import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BabelbeezApi implements ICredentialType {
	name = 'babelbeezApi';

	displayName = 'Babelbeez API';

	icon = 'file:../nodes/Babelbeez/babelbeez-logo-60x60.png' as const;

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
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: 'https://api.babelbeez.com',
			description: 'The Babelbeez API base URL. Change this only for local or staging testing.',
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
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '/api/v1/integrations/n8n/me',
		},
	};
}