import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { babelbeezApiRequest, BABELBEEZ_API_BASE_URL, BABELBEEZ_CREDENTIAL_TYPE } from '../shared/api';
import type { N8nChatbotListResponse } from '../shared/types';

export class Babelbeez implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Babelbeez',
		name: 'babelbeez',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg, @n8n/community-nodes/icon-validation
		icon: 'file:babelbeez-logo-60x60.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Work with Babelbeez voice agents and call-completed payload schemas',
		defaults: {
			name: 'Babelbeez',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: BABELBEEZ_CREDENTIAL_TYPE,
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BABELBEEZ_API_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Voice Agent',
						value: 'voiceAgent',
					},
				],
				default: 'voiceAgent',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['voiceAgent'],
					},
				},
				options: [
					{
						name: 'Get Schema',
						value: 'getSchema',
						action: 'Get voice agent schema',
						description: 'Retrieve monitored entity fields for a voice agent',
						routing: {
							request: {
								method: 'GET',
								url: '=/api/v1/integrations/n8n/chatbots/{{$parameter.publicChatbotId.value}}/schema',
							},
						},
					},
					{
						name: 'Get Test Event',
						value: 'getTestEvent',
						action: 'Get voice agent test event',
						description: 'Retrieve a sample call-completed event for a voice agent',
						routing: {
							request: {
								method: 'GET',
								url: '/api/v1/integrations/n8n/test',
								qs: {
									public_chatbot_id: '={{$parameter.publicChatbotId.value}}',
								},
							},
						},
					},
					{
						name: 'List',
						value: 'list',
						action: 'List voice agents',
						description: 'List voice agents available to this Babelbeez account',
						routing: {
							request: {
								method: 'GET',
								url: '/api/v1/integrations/n8n/chatbots',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'chatbots',
										},
									},
								],
							},
						},
					},
				],
				default: 'list',
			},
			{
				displayName: 'Voice Agent Name or ID',
				name: 'publicChatbotId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Choose a voice agent from the list, or specify its public ID using an expression',
				displayOptions: {
					show: {
						resource: ['voiceAgent'],
						operation: ['getSchema', 'getTestEvent'],
					},
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchVoiceAgents',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. 2bb0b7e7-8e75-47b6-a3a5-6f9c9027a111',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async searchVoiceAgents(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
				const response = await babelbeezApiRequest<N8nChatbotListResponse>(
					this,
					'GET',
					'/api/v1/integrations/n8n/chatbots',
				);

				const search = (filter ?? '').toLowerCase();
				const results: INodePropertyOptions[] = response.chatbots
					.filter((chatbot) => {
						return (
							!search ||
							chatbot.name.toLowerCase().includes(search) ||
							chatbot.public_chatbot_id.toLowerCase().includes(search)
						);
					})
					.map((chatbot) => ({
						name: chatbot.name,
						value: chatbot.public_chatbot_id,
						description: `${chatbot.monitored_entity_count} monitored entities`,
					}));

				return { results };
			},
		},
	};
}