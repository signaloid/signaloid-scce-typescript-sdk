import { AxiosInstance } from "axios";
import {
	DriveDetails,
	DriveRequest,
	DrivePatchRequest,
	ListDrivesResponse,
	ListDrivesQueryParams,
} from "../types/drives";
import { paginationParams } from "../utils/listParams";
import { listAllItems } from "../utils/paginate";
import type { ListAllOptions } from "../types/pagination";

export class DrivesManager {
	constructor(private readonly client: AxiosInstance) {}

	/** One page of Drives. See `cursor` for the next one. */
	public async list(options?: ListDrivesQueryParams): Promise<ListDrivesResponse> {
		const response = await this.client.get("/drives", { params: paginationParams(options) });
		return response.data;
	}

	/** Every DriveID across all pages, read 100 per page unless `limit` says otherwise. */
	public async listAll(options?: ListAllOptions<ListDrivesQueryParams>): Promise<string[]> {
		return listAllItems(
			(query) => this.list(query),
			options,
			(page) => page.DriveIDs,
		);
	}

	public async getOne(driveID: string): Promise<DriveDetails> {
		const response = await this.client.get(`/drives/${driveID}`);
		return response.data;
	}

	public async create(payload: DriveRequest): Promise<DriveDetails> {
		const response = await this.client.post("/drives", payload);
		return response.data;
	}

	public async update(driveID: string, payload: DrivePatchRequest): Promise<{ message: string }> {
		const response = await this.client.patch(`/drives/${driveID}`, payload);
		return response.data;
	}

	public async delete(driveID: string): Promise<{ message: string }> {
		const response = await this.client.delete(`/drives/${driveID}`);
		return response.data;
	}
}
