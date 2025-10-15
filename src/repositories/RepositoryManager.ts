import { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { AuthManager } from "../auth/AuthManager";
import {
  RepositoryDetails,
  RepositoryRequest,
  GetRepositoryBuildsQueryParams,
  RepositoryPatchRequest,
  ListRepositoriesResponse,
  ListBuildsByRepositoryResponse,
} from "../types/repositories";

export class RepositoriesManager {
  constructor(private readonly client: AxiosInstance) {}

  public async list(): Promise<ListRepositoriesResponse> {
    const response = await this.client.get("/repositories");
    return response.data;
  }

  public async getOne(repositoryID: string): Promise<RepositoryDetails> {
    const response = await this.client.get(`/repositories/${repositoryID}`);
    return response.data;
  }

  public async connect(payload: RepositoryRequest): Promise<RepositoryDetails> {
    const response = await this.client.post("/repositories", payload);
    return response.data;
  }

  public async update(
    repositoryID: string,
    payload: RepositoryPatchRequest,
  ): Promise<RepositoryDetails> {
    const response = await this.client.patch(
      `/repositories/${repositoryID}`,
      payload,
    );
    return response.data;
  }

  public async delete(repositoryID: string): Promise<void> {
    await this.client.delete(`/repositories/${repositoryID}`);
  }

  public async getBuilds(
    repositoryID: string,
    options?: GetRepositoryBuildsQueryParams,
  ): Promise<ListBuildsByRepositoryResponse> {
    const params: Record<string, string> = {};
    if (options?.startKey) {
      params.startKey = options.startKey;
    }
    if (options?.from) {
      params.from = options.from;
    }
    if (options?.to) {
      params.to = options.to;
    }

    const path = `/repositories/${repositoryID}/builds`;
    const response = await this.client.get(path, { params });
    return response.data;
  }
}
