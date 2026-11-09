import { AxiosInstance } from "axios";
import { AuthManager } from "../auth/AuthManager";
import {
	BucketDetails,
	BucketRequest,
	BucketPatchRequest,
	ListBucketsResponse,
	ListBucketsQueryParams,
} from "../types/buckets";
import { paginationParams } from "../utils/listParams";
import { listAllItems } from "../utils/paginate";
import type { ListAllOptions } from "../types/pagination";

export class BucketsManager {
	constructor(private readonly client: AxiosInstance) {}

	/** One page of Buckets. See `cursor` for the next one. */
	public async list(options?: ListBucketsQueryParams): Promise<ListBucketsResponse> {
		const response = await this.client.get("/buckets", { params: paginationParams(options) });
		return response.data;
	}

	/** Every BucketID across all pages, read 100 per page unless `limit` says otherwise. */
	public async listAll(options?: ListAllOptions<ListBucketsQueryParams>): Promise<string[]> {
		return listAllItems(
			(query) => this.list(query),
			options,
			(page) => page.BucketIDs,
		);
	}

	public async getOne(bucketID: string): Promise<BucketDetails> {
		const response = await this.client.get(`/buckets/${bucketID}`);
		return response.data;
	}

	public async create(payload: BucketRequest): Promise<BucketDetails> {
		const response = await this.client.post("/buckets", payload);
		return response.data;
	}

	public async update(bucketID: string, payload: BucketPatchRequest): Promise<{ message: string }> {
		const response = await this.client.patch(`/buckets/${bucketID}`, payload);
		return response.data;
	}

	public async delete(bucketID: string): Promise<{ message: string }> {
		const response = await this.client.delete(`/buckets/${bucketID}`);
		return response.data;
	}
}
