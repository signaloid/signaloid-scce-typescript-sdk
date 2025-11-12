import { AxiosInstance } from "axios";
import {
  CoreDetails,
  CorePatchRequest,
  CoreRequest,
  ListCoresQueryParams,
  ListCoresResponse,
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
    const req1 = this.client.get(`/cores/${coreID}`);
    const req2 = this.client.get(`/cores/${coreID}`, {
      params: { default: true },
    });

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.find((r) => r.status === "fulfilled");

    if (fulfilled) {
      return fulfilled.value.data;
    }

    const firstError = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    )?.reason;
    if (firstError instanceof Error) throw firstError;
    throw new Error(String(firstError) || "Both core requests failed");
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
