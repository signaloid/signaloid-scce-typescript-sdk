import { AxiosInstance } from "axios";
import {
  CreateWebhookRequest,
  CreateWebhookResponse,
  ListWebhooksResponse,
  WebhookDetails,
  UpdateWebhookRequest,
  WebhookEventType,
} from "../types/webhooks";

export class WebhooksManager {
  constructor(private readonly client: AxiosInstance) {}

  public async create(
    payload: CreateWebhookRequest,
  ): Promise<CreateWebhookResponse> {
    const response = await this.client.post<CreateWebhookResponse>(
      "/webhooks",
      payload,
    );
    return response.data;
  }

  public async list(): Promise<ListWebhooksResponse> {
    const response = await this.client.get<ListWebhooksResponse>("/webhooks");
    return response.data;
  }

  public async getOne(webhookId: string): Promise<WebhookDetails> {
    const response = await this.client.get<WebhookDetails>(
      `/webhooks/${webhookId}`,
    );
    return response.data;
  }

  public async update(
    webhookId: string,
    payload: UpdateWebhookRequest,
  ): Promise<WebhookDetails> {
    const response = await this.client.put<WebhookDetails>(
      `/webhooks/${webhookId}`,
      payload,
    );
    return response.data;
  }

  public async delete(webhookId: string): Promise<void> {
    await this.client.delete(`/webhooks/${webhookId}`);
  }

  public async enable(webhookId: string): Promise<WebhookDetails> {
    return this.update(webhookId, { status: "active" });
  }

  public async disable(webhookId: string): Promise<WebhookDetails> {
    return this.update(webhookId, { status: "disabled" });
  }

  public async updateUrl(
    webhookId: string,
    url: string,
  ): Promise<WebhookDetails> {
    return this.update(webhookId, { url });
  }

  public async updateEvents(
    webhookId: string,
    events: WebhookEventType[],
  ): Promise<WebhookDetails> {
    return this.update(webhookId, { events });
  }

  public async addEvents(
    webhookId: string,
    newEvents: WebhookEventType[],
  ): Promise<WebhookDetails> {
    const webhook = await this.getOne(webhookId);
    const updatedEvents = [...new Set([...webhook.Events, ...newEvents])];
    return this.update(webhookId, { events: updatedEvents });
  }

  public async removeEvents(
    webhookId: string,
    eventsToRemove: WebhookEventType[],
  ): Promise<WebhookDetails> {
    const webhook = await this.getOne(webhookId);
    const updatedEvents = webhook.Events.filter(
      (event) => !eventsToRemove.includes(event as WebhookEventType),
    );

    if (updatedEvents.length === 0) {
      throw new Error(
        "Cannot remove all events from webhook. At least one event is required.",
      );
    }

    return this.update(webhookId, { events: updatedEvents });
  }

  public async getByStatus(
    status: "active" | "disabled",
  ): Promise<WebhookDetails[]> {
    const response = await this.list();
    return response.webhooks.filter((webhook) => webhook.Status === status);
  }

  public async getActive(): Promise<WebhookDetails[]> {
    return this.getByStatus("active");
  }

  public async getDisabled(): Promise<WebhookDetails[]> {
    return this.getByStatus("disabled");
  }

  public async getByEventType(
    eventType: WebhookEventType,
  ): Promise<WebhookDetails[]> {
    const response = await this.list();
    return response.webhooks.filter(
      (webhook) =>
        webhook.Events &&
        Array.isArray(webhook.Events) &&
        webhook.Events.includes(eventType),
    );
  }

  public async getStats(): Promise<{
    total: number;
    active: number;
    disabled: number;
    withFailures: number;
    recentlyFailed: WebhookDetails[];
  }> {
    const response = await this.list();
    const webhooks = response.webhooks;

    const stats = {
      total: webhooks.length,
      active: webhooks.filter((w) => w.Status === "active").length,
      disabled: webhooks.filter((w) => w.Status === "disabled").length,
      withFailures: webhooks.filter((w) => w.FailureCount > 0).length,
      recentlyFailed: webhooks.filter(
        (w) =>
          w.LastDeliveryStatus && w.LastDeliveryStatus.startsWith("failed"),
      ),
    };

    return stats;
  }
}
