import { AxiosInstance } from "axios";
import {
  DriveDetails,
  DriveRequest,
  DrivePatchRequest,
  ListDrivesResponse,
  ListDrivesQueryParams,
} from "../types/drives";

export class DrivesManager {
  constructor(private readonly client: AxiosInstance) {}

  public async list(
    options?: ListDrivesQueryParams,
  ): Promise<ListDrivesResponse> {
    const params: Record<string, string> = {};
    if (options?.startKey) {
      params.startKey = options.startKey;
    }

    const response = await this.client.get("/drives", { params });
    return response.data;
  }

  public async getOne(driveID: string): Promise<DriveDetails> {
    const response = await this.client.get(`/drives/${driveID}`);
    return response.data;
  }

  public async create(payload: DriveRequest): Promise<DriveDetails> {
    const response = await this.client.post("/drives", payload);
    return response.data;
  }

  public async update(
    driveID: string,
    payload: DrivePatchRequest,
  ): Promise<{ message: string }> {
    const response = await this.client.patch(`/drives/${driveID}`, payload);
    return response.data;
  }

  public async delete(driveID: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/drives/${driveID}`);
    return response.data;
  }
}
