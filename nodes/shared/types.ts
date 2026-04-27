export interface BabelbeezCredentials {
	apiKey: string;
}

export interface N8nChatbotInfo {
	id: string;
	name: string;
	public_chatbot_id: string;
	has_monitored_entities: boolean;
	monitored_entity_count: number;
}

export interface N8nChatbotListResponse {
	chatbots: N8nChatbotInfo[];
}

export interface N8nSchemaField {
	key: string;
	label: string;
	type: string;
	path: string;
	description?: string;
	required: boolean;
}

export interface N8nSchemaResponse {
	event: 'call_completed';
	public_chatbot_id: string;
	fields: N8nSchemaField[];
	data_fields: N8nSchemaField[];
}

export interface CallCompletedWebhookEvent {
	session_id: string;
	public_chatbot_id?: string | null;
	user_id?: string | null;
	timestamp: string;
	duration_seconds?: number | null;
	status?: string | null;
	summary?: string | null;
	data: Record<string, string | null>;
}

export interface N8nSubscribeResponse {
	status: 'subscribed';
	subscription_id: string;
	public_chatbot_id: string;
	target_url: string;
	secret: string;
	event: 'call_completed';
	signature_header: string;
	timestamp_header: string;
	event_header: string;
	signature_version: string;
	signature_algorithm: string;
	signature_payload: string;
}

export interface N8nUnsubscribeResponse {
	message: string;
	disabled: boolean;
}

export interface BabelbeezTriggerStaticData {
	subscriptionId?: string;
	secret?: string;
	publicChatbotId?: string;
	targetUrl?: string;
}