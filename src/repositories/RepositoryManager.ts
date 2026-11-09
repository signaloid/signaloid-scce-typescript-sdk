import { AxiosInstance } from "axios";
import { ERROR_CODES } from "../errors/codes";
import { SdkError } from "../errors/SdkError";
import {
	GetRepositoryBuildsQueryParams,
	ListBuildsByRepositoryResponse,
	ListRepositoriesQueryParams,
	ListRepositoriesResponse,
	LookupRepositoryRequest,
	LookupRepositoryResponse,
	RepositoryDetails,
	RepositoryPatchRemovableField,
	RepositoryPatchRequest,
	RepositoryRequest,
} from "../types/repositories";
import { paginationParams, timeFilteredListParams, withLegacyStartKey } from "../utils/listParams";
import { listAllItems } from "../utils/paginate";
import type { ListAllOptions } from "../types/pagination";

export class RepositoriesManager {
	constructor(private readonly client: AxiosInstance) {}

	/**
	 * One page of Repositories. See `cursor` for the next one. A string argument is the
	 * deprecated `startKey`.
	 */
	public async list(options?: ListRepositoriesQueryParams | string): Promise<ListRepositoriesResponse> {
		const response = await this.client.get("/repositories", {
			params: paginationParams(withLegacyStartKey(options)),
		});
		return response.data;
	}

	/** Every Repository across all pages, read 100 per page unless `limit` says otherwise. */
	public async listAll(options?: ListAllOptions<ListRepositoriesQueryParams>): Promise<RepositoryDetails[]> {
		return listAllItems(
			(query) => this.list(query),
			options,
			(page) => page.Repositories,
		);
	}

	public async getOne(repositoryID: string): Promise<RepositoryDetails> {
		const response = await this.client.get(`/repositories/${repositoryID}`);
		return response.data;
	}

	public async lookup(request: LookupRepositoryRequest): Promise<LookupRepositoryResponse | null> {
		try {
			const response = await this.client.get("/repositories/lookup", {
				params: {
					remoteURL: request.RemoteURL,
					branch: request.Branch,
				},
			});
			return response.data as LookupRepositoryResponse;
		} catch (error) {
			if (error instanceof SdkError && error.code === ERROR_CODES.API_NOT_FOUND) {
				return null;
			}
			throw error;
		}
	}

	/** Fails with 403 when the Core is not on the caller's tier. */
	public async connect(payload: RepositoryRequest): Promise<RepositoryDetails> {
		const response = await this.client.post("/repositories", payload);
		return response.data;
	}

	/**
	 * When `options.remove` is set, the API removes those fields and ignores `payload`.
	 *
	 * Fails with 403 when the new Core is not on the caller's tier.
	 */
	public async update(
		repositoryID: string,
		payload: RepositoryPatchRequest,
		options?: { remove?: RepositoryPatchRemovableField[] },
	): Promise<RepositoryDetails> {
		let params: URLSearchParams | undefined;
		if (options?.remove && options.remove.length > 0) {
			params = new URLSearchParams();
			for (const field of options.remove) {
				params.append("remove", field);
			}
		}
		const response = await this.client.patch(`/repositories/${repositoryID}`, payload, {
			params,
		});
		return response.data;
	}

	/**
	 * @deprecated Use {@link disconnect} instead.
	 *
	 * The `delete()` method has been deprecated because it performs a disconnection
	 * from the repository rather than a permanent deletion. Use `disconnect()` instead,
	 * which performs the same action but better describes the intent.
	 */
	public async delete(repositoryID: string): Promise<void> {
		await this.client.delete(`/repositories/${repositoryID}`);
	}

	public async disconnect(repositoryID: string): Promise<void> {
		await this.client.delete(`/repositories/${repositoryID}`);
	}

	public async getBuilds(
		repositoryID: string,
		options?: GetRepositoryBuildsQueryParams,
	): Promise<ListBuildsByRepositoryResponse> {
		const params = timeFilteredListParams(options);

		const path = `/repositories/${repositoryID}/builds`;
		const response = await this.client.get(path, { params });
		return response.data;
	}
}
