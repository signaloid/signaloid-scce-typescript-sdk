import type { AtLeastOne } from ".";
import type { BuildStatusEventData, TaskStatusEventData, UsageEventData } from "./realtime";
import type { CursorPaginatedResponse, CursorQueryParams } from "./pagination";

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
	URL: string;
	/** At least one event. */
	Events: WebhookEventType[];
	Description?: string;
};

/** The new webhook, plus the signing secret, which the API returns only here. */
export type CreateWebhookResponse = WebhookDetails & {
	/** Keep it: it verifies `Signaloid-Webhook-Signature` and cannot be fetched again. */
	Secret: string;
};

export type UpdateWebhookRequest = AtLeastOne<{
	URL: string;
	Events: WebhookEventType[];
	Description: string;
	Status: WebhookStatus;
}>;

export type WebhookDetails = {
	Object: string;
	WebhookID: string;
	URL: string;
	Events: WebhookEventType[];
	Description: string;
	Status: WebhookStatus;
	CreatedAt: string;
	UpdatedAt: string;
	FailureCount: number;
	LastDeliveryStatus: string | null;
	LastDeliveryTime: string | null;
};

export type ListWebhooksQueryParams = CursorQueryParams;

export type ListWebhooksResponse = CursorPaginatedResponse & {
	Webhooks: WebhookDetails[];
	Count: number;
};

/**
 * The body your endpoint receives for each delivery. Verify it first: the
 * `Signaloid-Webhook-Signature` header is `sha256=` followed by the hex HMAC-SHA256 of
 * `<Signaloid-Webhook-Timestamp>.<raw body>`, keyed with the webhook's `Secret`.
 */
export type WebhookDelivery = {
	Version: "2.0";
	/** Also sent as the `Signaloid-Webhook-Id` header. */
	ID: string;
	Created: string;
} & (
	| { Event: "task-status"; Data: TaskStatusEventData }
	| { Event: "build-status"; Data: BuildStatusEventData }
	| { Event: Exclude<WebhookEventType, "task-status" | "build-status">; Data: UsageEventData }
);
