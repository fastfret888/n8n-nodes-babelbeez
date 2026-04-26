import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { babelbeezApiRequest, BABELBEEZ_CREDENTIAL_TYPE } from '../shared/api';
import type {
	CallCompletedWebhookEvent,
	N8nChatbotListResponse,
	N8nSchemaResponse,
} from '../shared/types';

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
					},
					{
						name: 'Get Test Event',
						value: 'getTestEvent',
						action: 'Get voice agent test event',
						description: 'Retrieve a sample call-completed event for a voice agent',
					},
					{
						name: 'List',
						value: 'list',
						action: 'List voice agents',
						description: 'List voice agents available to this Babelbeez account',
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		const returnData: INodeExecutionData[] = [];

		if (operation === 'list') {
			const response = await babelbeezApiRequest<N8nChatbotListResponse>(
				this,
				'GET',
				'/api/v1/integrations/n8n/chatbots',
			);

			return [this.helpers.returnJsonArray(response.chatbots as unknown as IDataObject[])];
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const publicChatbotId = this.getNodeParameter(
					'publicChatbotId.value',
					itemIndex,
					'',
				) as string;

				if (!publicChatbotId) {
					throw new NodeOperationError(this.getNode(), 'Select a voice agent', {
						description: "Choose a voice agent in 'Voice Agent Name or ID' before running this operation.",
						itemIndex,
					});
				}

				let response: N8nSchemaResponse | CallCompletedWebhookEvent;
				if (operation === 'getSchema') {
					response = await babelbeezApiRequest<N8nSchemaResponse>(
						this,
						'GET',
						`/api/v1/integrations/n8n/chatbots/${encodeURIComponent(publicChatbotId)}/schema`,
					);
				} else if (operation === 'getTestEvent') {
					response = await babelbeezApiRequest<CallCompletedWebhookEvent>(
						this,
						'GET',
						'/api/v1/integrations/n8n/test',
						{
							qs: { public_chatbot_id: publicChatbotId },
						},
					);
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation '${operation}'`, {
						itemIndex,
					});
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response as unknown as IDataObject),
					{ itemData: { item: itemIndex } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				throw error;
			}
		}

		return [returnData];
	}
}