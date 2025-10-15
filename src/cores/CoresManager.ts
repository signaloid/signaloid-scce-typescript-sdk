import { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { AuthManager } from "../auth/AuthManager";
import {
  CoreDetails,
  CoreRequest,
  CorePatchRequest,
  ListCoresResponse,
  ListCoresQueryParams,
} from "../types/cores";

export class CoresManager {
  constructor(private readonly client: AxiosInstance) {}

  public async list(
    options?: ListCoresQueryParams,
  ): Promise<ListCoresResponse> {
    const params: Record<string, string> = {};
    if (options?.default !== undefined) {
      params.default = options.default.toString();
    }

    const response = await this.client.get("/cores", { params });
    return response.data;
  }

  public async getOne(coreID: string): Promise<CoreDetails> {
    const response = await this.client.get(`/cores/${coreID}`);
    return response.data;
  }

  public async create(payload: CoreRequest): Promise<CoreDetails> {
    const response = await this.client.post("/cores", payload);
    return response.data;
  }

  public async update(
    coreID: string,
    payload: CorePatchRequest,
  ): Promise<{ message: string }> {
    const response = await this.client.patch(`/cores/${coreID}`, payload);
    return response.data;
  }

  public async delete(coreID: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/cores/${coreID}`);
    return response.data;
  }
}
