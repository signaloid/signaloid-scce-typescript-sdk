import type { AtLeastOne } from ".";

export type WebhookStatus = "active" | "disabled";

export type WebhookEventType =
	| "task-status"
	| "build-status"
	| "task-stats"
	| "build-stats"
	| "task-count"
	| "build-count";

export type CreateWebhookRequest = {
	/** An `https` URL. The API refuses localhost and private, link-local or internal addresses. */
	url: string;
	/** At least one event. */
	events: WebhookEventType[];
	description?: string;
};

export type CreateWebhookResponse = {
	webhookId: string;
	url: string;
	events: string[];
	description?: string;
	secret: string;
	status: WebhookStatus;
	createdAt: string;
};

export type UpdateWebhookRequest = AtLeastOne<{
	url: string;
	events: WebhookEventType[];
	description: string;
	status: WebhookStatus;
}>;

export type WebhookDetails = {
	Object: string;
	WebhookID: string;
	URL: string;
	Events: string[];
	Description: string;
	Status: WebhookStatus;
	CreatedAt: string;
	UpdatedAt: string;
	FailureCount: number;
	LastDeliveryStatus: string | null;
	LastDeliveryTime: string | null;
};

export type ListWebhooksResponse = {
	webhooks: WebhookDetails[];
	count: number;
};
