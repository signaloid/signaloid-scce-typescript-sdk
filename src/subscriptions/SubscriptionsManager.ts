import { AxiosInstance } from "axios";
import {
  SubscriptionDetails,
  SubscriptionUpdateRequest,
} from "../types/subscriptions";

export class SubscriptionsManager {
  constructor(private readonly client: AxiosInstance) {}

  public async get(): Promise<SubscriptionDetails> {
    const response = await this.client.get<{
      subscription: SubscriptionDetails;
    }>("/subscriptions");
    return response.data.subscription;
  }

  public async update(
    payload: SubscriptionUpdateRequest,
    options?: { freeTrialOption?: boolean },
  ): Promise<{ subscription: SubscriptionDetails }> {
    const response = await this.client.put<{
      subscription: SubscriptionDetails;
    }>("/subscriptions", payload, {
      params:
        options?.freeTrialOption !== undefined
          ? { freeTrialOption: options.freeTrialOption }
          : undefined,
    });
    return response.data;
  }
}
