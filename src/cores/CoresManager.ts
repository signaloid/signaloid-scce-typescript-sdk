import { AxiosInstance } from "axios";
import {
	CoreDetails,
	CorePatchRequest,
	CoreRequest,
	ListAllCoresOptions,
	ListCoresQueryParams,
	ListCoresResponse,
} from "../types/cores";
import { paginationParams } from "../utils/listParams";
import { listAllItems } from "../utils/paginate";

export class CoresManager {
	constructor(private readonly client: AxiosInstance) {}

	/** One page of Cores. See `cursor` for the next one. */
	public async list(options?: ListCoresQueryParams): Promise<ListCoresResponse> {
		const params = paginationParams(options);
		if (options?.default !== undefined) {
			params.default = options.default.toString();
		}

		const response = await this.client.get("/cores", { params });
		return response.data;
	}

	/**
	 * Every Core across all pages, read 100 per page unless `limit` says otherwise. Prefer it
	 * with `default`, whose pages can be short or empty.
	 */
	public async listAll(options?: ListAllCoresOptions): Promise<CoreDetails[]> {
		return listAllItems(
			(query) => this.list(query),
			options,
			(page) => page.Cores,
		);
	}

	public async getOne(coreID: string): Promise<CoreDetails> {
		const req1 = this.client.get(`/cores/${coreID}`);
		const req2 = this.client.get(`/cores/${coreID}`, { params: { default: true } });

		const results = await Promise.allSettled([req1, req2]);
		const fulfilled = results.find((r) => r.status === "fulfilled");

		if (fulfilled) {
			return fulfilled.value.data;
		}

		const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected")?.reason;
		if (firstError instanceof Error) throw firstError;
		throw new Error(String(firstError) || "Both core requests failed");
	}

	public async create(payload: CoreRequest): Promise<CoreDetails> {
		const response = await this.client.post("/cores", payload);
		return response.data;
	}

	public async update(coreID: string, payload: CorePatchRequest): Promise<{ message: string }> {
		const response = await this.client.patch(`/cores/${coreID}`, payload);
		return response.data;
	}

	public async delete(coreID: string): Promise<{ message: string }> {
		const response = await this.client.delete(`/cores/${coreID}`);
		return response.data;
	}
}
