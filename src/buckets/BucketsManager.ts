import { AxiosInstance } from "axios";
import { AuthManager } from "../auth/AuthManager";
import {
  BucketDetails,
  BucketRequest,
  BucketPatchRequest,
  ListBucketsResponse,
  ListBucketsQueryParams,
} from "../types/buckets";

export class BucketsManager {
  constructor(private readonly client: AxiosInstance) {}

  public async list(
    options?: ListBucketsQueryParams,
  ): Promise<ListBucketsResponse> {
    const params: Record<string, string> = {};
    if (options?.startKey) {
      params.startKey = options.startKey;
    }

    const response = await this.client.get("/buckets", { params });
    return response.data;
  }

  public async getOne(bucketID: string): Promise<BucketDetails> {
    const response = await this.client.get(`/buckets/${bucketID}`);
    return response.data;
  }

  public async create(payload: BucketRequest): Promise<BucketDetails> {
    const response = await this.client.post("/buckets", payload);
    return response.data;
  }

  public async update(
    bucketID: string,
    payload: BucketPatchRequest,
  ): Promise<{ message: string }> {
    const response = await this.client.patch(`/buckets/${bucketID}`, payload);
    return response.data;
  }

  public async delete(bucketID: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/buckets/${bucketID}`);
    return response.data;
  }
}
