import { AxiosInstance } from "axios";
import { KeyDetails, KeyRequest, ListKeysQueryParams, ListKeysResponse } from "../types/keys";
import { paginationParams } from "../utils/listParams";
import { listAllItems } from "../utils/paginate";
import type { ListAllOptions } from "../types/pagination";

export class KeysManager {
	constructor(private readonly client: AxiosInstance) {}

	/** One page of keys. See `cursor` for the next one. */
	public async list(options?: ListKeysQueryParams): Promise<ListKeysResponse> {
		const response = await this.client.get("/keys", { params: paginationParams(options) });
		return response.data;
	}

	/** Every key across all pages. */
	public async listAll(options?: ListAllOptions<ListKeysQueryParams>): Promise<KeyDetails[]> {
		return listAllItems(
			(query) => this.list(query),
			options,
			(page) => page.Keys,
		);
	}

	public async create(payload: KeyRequest): Promise<KeyDetails> {
		const response = await this.client.post("/keys", payload);
		return response.data;
	}

	public async delete(keyID: string): Promise<{ message: string }> {
		const response = await this.client.delete(`/keys/${keyID}`);
		return response.data;
	}
}
