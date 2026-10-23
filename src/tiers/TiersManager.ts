import { AxiosInstance } from "axios";
import { ListTiersResponse } from "../types/tiers";

export class TiersManager {
	constructor(private readonly client: AxiosInstance) {}

	/** Every tier with the limits it grants, cheapest first. For the caller's own, see `users.me()`. */
	public async list(): Promise<ListTiersResponse> {
		const response = await this.client.get<ListTiersResponse>("/tiers");
		return response.data;
	}
}
