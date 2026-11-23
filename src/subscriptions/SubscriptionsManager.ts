import { AxiosInstance } from "axios";
import { SubscriptionDetails, SubscriptionUpdateRequest, SubscriptionUpdateResponse } from "../types/subscriptions";

export class SubscriptionsManager {
	constructor(private readonly client: AxiosInstance) {}

	public async get(): Promise<SubscriptionDetails> {
		const response = await this.client.get<{ subscription: SubscriptionDetails }>("/subscriptions");
		return response.data.subscription;
	}

	public async update(
		payload: SubscriptionUpdateRequest,
		options?: { freeTrialOption?: boolean },
	): Promise<SubscriptionUpdateResponse> {
		// The API treats any freeTrialOption value, including "false", as a free-trial request.
		const response = await this.client.put<SubscriptionUpdateResponse>("/subscriptions", payload, {
			params: options?.freeTrialOption === true ? { freeTrialOption: true } : undefined,
		});
		return response.data;
	}
}
