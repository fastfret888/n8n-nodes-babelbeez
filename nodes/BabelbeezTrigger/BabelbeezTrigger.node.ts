import { createHmac, timingSafeEqual } from 'crypto';

import type {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { babelbeezApiRequest, BABELBEEZ_CREDENTIAL_TYPE } from '../shared/api';
import type {
	BabelbeezTriggerStaticData,
	CallCompletedWebhookEvent,
	N8nChatbotListResponse,
	N8nSubscribeResponse,
	N8nUnsubscribeResponse,
} from '../shared/types';

const WEBHOOK_NAME = 'default';
const SIGNATURE_PREFIX = 'v1=';
const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;

function getHeaderValue(headers: Record<string, string | string[] | undefined>, name: string): string {
	const value = headers[name.toLowerCase()];
	return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function verifySignature(rawBody: Buffer, timestamp: string, signatureHeader: string, secret: string): boolean {
	if (!timestamp || !signatureHeader.startsWith(SIGNATURE_PREFIX) || !secret) {
		return false;
	}

	const timestampMs = Date.parse(timestamp);
	if (!Number.isFinite(timestampMs)) {
		return false;
	}

	const ageSeconds = Math.abs(Date.now() - timestampMs) / 1000;
	if (ageSeconds > MAX_SIGNATURE_AGE_SECONDS) {
		return false;
	}

	const receivedSignature = signatureHeader.slice(SIGNATURE_PREFIX.length);
	const expectedSignature = createHmac('sha256', secret)
		.update(`${timestamp}.`)
		.update(rawBody)
		.digest('hex');

	const received = Buffer.from(receivedSignature, 'hex');
	const expected = Buffer.from(expectedSignature, 'hex');

	if (received.length !== expected.length) {
		return false;
	}

	return timingSafeEqual(received, expected);
}

function getRawBody(context: IWebhookFunctions): Buffer {
	const request = context.getRequestObject();
	if (request.rawBody) {
		return request.rawBody;
	}

	return Buffer.from(JSON.stringify(context.getBodyData()));
}

export class BabelbeezTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Babelbeez Trigger',
		name: 'babelbeezTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg, @n8n/community-nodes/icon-validation
		icon: 'file:babelbeez-logo-60x60.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts a workflow when a Babelbeez voice agent call is completed',
		defaults: {
			name: 'Babelbeez Trigger',
		},
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: BABELBEEZ_CREDENTIAL_TYPE,
				required: true,
			},
		],
		webhooks: [
			{
				name: WEBHOOK_NAME,
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'babelbeez-call-completed',
			},
		],
		eventTriggerDescription:
			'Waiting for a Babelbeez completed-call event. To test, complete a call in the Babelbeez preview for the selected voice agent.',
		activationMessage: 'Babelbeez will now send completed-call events to this workflow.',
		properties: [
			{
				displayName: 'Voice Agent Name or ID',
				name: 'publicChatbotId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description:
					'Choose the voice agent whose completed calls should trigger this workflow. For test executions, click Execute Step and complete a call in the Babelbeez preview for this agent.',
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

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as BabelbeezTriggerStaticData;
				return Boolean(staticData.subscriptionId && staticData.secret);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl(WEBHOOK_NAME);
				const publicChatbotId = this.getNodeParameter('publicChatbotId.value', '') as string;

				if (!webhookUrl) {
					throw new NodeOperationError(this.getNode(), 'Webhook URL is not available');
				}

				if (!publicChatbotId) {
					throw new NodeOperationError(this.getNode(), 'Select a voice agent', {
						description: "Choose a voice agent in 'Voice Agent Name or ID' before activating this trigger.",
					});
				}

				const workflow = this.getWorkflow();
				const response = await babelbeezApiRequest<N8nSubscribeResponse>(
					this,
					'POST',
					'/api/v1/integrations/n8n/subscribe',
					{
						body: {
							public_chatbot_id: publicChatbotId,
							target_url: webhookUrl,
							external_subscription_id: `${workflow.id ?? 'workflow'}:${this.getNode().id}`,
							metadata: {
								workflow_id: workflow.id,
								workflow_name: workflow.name,
								node_id: this.getNode().id,
								node_name: this.getNode().name,
							},
						},
					},
				);

				const staticData = this.getWorkflowStaticData('node') as BabelbeezTriggerStaticData;
				staticData.subscriptionId = response.subscription_id;
				staticData.secret = response.secret;
				staticData.publicChatbotId = response.public_chatbot_id;
				staticData.targetUrl = response.target_url;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as BabelbeezTriggerStaticData;
				const publicChatbotId = this.getNodeParameter('publicChatbotId.value', '') as string;
				const webhookUrl = this.getNodeWebhookUrl(WEBHOOK_NAME);

				await babelbeezApiRequest<N8nUnsubscribeResponse>(
					this,
					'POST',
					'/api/v1/integrations/n8n/unsubscribe',
					{
						body: {
							subscription_id: staticData.subscriptionId,
							public_chatbot_id: staticData.publicChatbotId ?? publicChatbotId,
							target_url: staticData.targetUrl ?? webhookUrl,
						},
					},
				);

				delete staticData.subscriptionId;
				delete staticData.secret;
				delete staticData.publicChatbotId;
				delete staticData.targetUrl;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const response = this.getResponseObject();
		const headers = this.getHeaderData() as Record<string, string | string[] | undefined>;
		const eventName = getHeaderValue(headers, 'x-babelbeez-event');
		const timestamp = getHeaderValue(headers, 'x-babelbeez-timestamp');
		const signature = getHeaderValue(headers, 'x-babelbeez-signature');
		const staticData = this.getWorkflowStaticData('node') as BabelbeezTriggerStaticData;

		if (eventName !== 'call_completed') {
			response.status(400).json({ message: 'Unsupported Babelbeez event' });
			return { noWebhookResponse: true };
		}

		const rawBody = getRawBody(this);
		const isValidSignature = verifySignature(rawBody, timestamp, signature, staticData.secret ?? '');

		if (!isValidSignature) {
			response.status(401).json({ message: 'Invalid Babelbeez signature' });
			return { noWebhookResponse: true };
		}

		let body = this.getBodyData() as unknown as CallCompletedWebhookEvent;
		if (!body || Object.keys(body as unknown as IDataObject).length === 0) {
			body = JSON.parse(rawBody.toString('utf8')) as CallCompletedWebhookEvent;
		}

		return {
			workflowData: [
				[
					{
						json: body as unknown as IDataObject,
					},
				],
			],
			webhookResponse: { received: true },
		};
	}
}