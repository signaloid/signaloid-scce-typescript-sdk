import { AxiosInstance } from "axios";
import {
  SubscriptionDetails,
  SubscriptionUpdateRequest,
} from "../types/subscriptions";

export class SubscriptionsManager {
  constructor(private readonly client: AxiosInstance) {}

  public async get(): Promise<SubscriptionDetails> {
    const response = await this.client.get("/subscriptions");
    return response.data;
  }

  public async update(
    payload: SubscriptionUpdateRequest,
  ): Promise<{ message: string }> {
    const response = await this.client.put("/subscriptions", payload);
    return response.data;
  }
}
