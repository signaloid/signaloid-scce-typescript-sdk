import { AxiosInstance } from "axios";
import { SuccessMessage } from "../types";
import {
	CreateWebhookRequest,
	CreateWebhookResponse,
	ListWebhooksQueryParams,
	ListWebhooksResponse,
	WebhookDetails,
	UpdateWebhookRequest,
	UpdateWebhookResponse,
	WebhookEventType,
} from "../types/webhooks";
import { paginationParams } from "../utils/listParams";
import { listAllItems } from "../utils/paginate";
import type { ListAllOptions } from "../types/pagination";

export class WebhooksManager {
	constructor(private readonly client: AxiosInstance) {}

	public async create(payload: CreateWebhookRequest): Promise<CreateWebhookResponse> {
		const response = await this.client.post<CreateWebhookResponse>("/webhooks", payload);
		return response.data;
	}

	/** One page of webhooks. See `cursor` for the next one. */
	public async list(options?: ListWebhooksQueryParams): Promise<ListWebhooksResponse> {
		const response = await this.client.get<ListWebhooksResponse>("/webhooks", {
			params: paginationParams(options),
		});
		return response.data;
	}

	/** Every webhook across all pages. */
	public async listAll(options?: ListAllOptions<ListWebhooksQueryParams>): Promise<WebhookDetails[]> {
		return listAllItems(
			(query) => this.list(query),
			options,
			(page) => page.Webhooks,
		);
	}

	public async getOne(webhookId: string): Promise<WebhookDetails> {
		const response = await this.client.get<WebhookDetails>(`/webhooks/${webhookId}`);
		return response.data;
	}

	public async update(webhookId: string, payload: UpdateWebhookRequest): Promise<UpdateWebhookResponse> {
		const response = await this.client.put<UpdateWebhookResponse>(`/webhooks/${webhookId}`, payload);
		return response.data;
	}

	public async delete(webhookId: string): Promise<SuccessMessage> {
		const response = await this.client.delete<SuccessMessage>(`/webhooks/${webhookId}`);
		return response.data;
	}

	public async enable(webhookId: string): Promise<UpdateWebhookResponse> {
		return this.update(webhookId, { Status: "active" });
	}

	public async disable(webhookId: string): Promise<UpdateWebhookResponse> {
		return this.update(webhookId, { Status: "disabled" });
	}

	public async updateUrl(webhookId: string, url: string): Promise<UpdateWebhookResponse> {
		return this.update(webhookId, { URL: url });
	}

	public async updateEvents(webhookId: string, events: WebhookEventType[]): Promise<UpdateWebhookResponse> {
		return this.update(webhookId, { Events: events });
	}

	public async addEvents(webhookId: string, newEvents: WebhookEventType[]): Promise<UpdateWebhookResponse> {
		const webhook = await this.getOne(webhookId);
		const updatedEvents = [...new Set([...webhook.Events, ...newEvents])];
		return this.update(webhookId, { Events: updatedEvents });
	}

	public async removeEvents(
		webhookId: string,
		eventsToRemove: WebhookEventType[],
	): Promise<UpdateWebhookResponse> {
		const webhook = await this.getOne(webhookId);
		const updatedEvents = webhook.Events.filter((event) => !eventsToRemove.includes(event));

		if (updatedEvents.length === 0) {
			throw new Error("Cannot remove all events from webhook. At least one event is required.");
		}

		return this.update(webhookId, { Events: updatedEvents });
	}

	/** The webhooks with this status, from every page. */
	public async getByStatus(status: "active" | "disabled"): Promise<WebhookDetails[]> {
		return (await this.listAll()).filter((webhook) => webhook.Status === status);
	}

	public async getActive(): Promise<WebhookDetails[]> {
		return this.getByStatus("active");
	}

	public async getDisabled(): Promise<WebhookDetails[]> {
		return this.getByStatus("disabled");
	}

	/** The webhooks subscribed to this event type, from every page. */
	public async getByEventType(eventType: WebhookEventType): Promise<WebhookDetails[]> {
		return (await this.listAll()).filter(
			(webhook) =>
				webhook.Events && Array.isArray(webhook.Events) && webhook.Events.includes(eventType),
		);
	}

	/** Counts over every webhook, from every page. */
	public async getStats(): Promise<{
		total: number;
		active: number;
		disabled: number;
		withFailures: number;
		recentlyFailed: WebhookDetails[];
	}> {
		const webhooks = await this.listAll();

		const stats = {
			total: webhooks.length,
			active: webhooks.filter((w) => w.Status === "active").length,
			disabled: webhooks.filter((w) => w.Status === "disabled").length,
			withFailures: webhooks.filter((w) => w.FailureCount > 0).length,
			recentlyFailed: webhooks.filter(
				(w) => w.LastDeliveryStatus && w.LastDeliveryStatus.startsWith("failed"),
			),
		};

		return stats;
	}
}
