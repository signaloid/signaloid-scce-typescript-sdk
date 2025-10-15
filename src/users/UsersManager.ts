import { AxiosInstance } from "axios";
import {
  UserDetails,
  UserPatchRequest,
  UserCustomization,
  UserLogsResponse,
  UserLogsQueryParams,
  UserUpdateResponse,
} from "../types/users";

export class UsersManager {
  constructor(private readonly client: AxiosInstance) {}

  public async getOne(userID: string): Promise<UserDetails> {
    const response = await this.client.get(`/users/${userID}`);
    return response.data;
  }

  public async me(): Promise<UserDetails> {
    const response = await this.client.get(`users/me`);
    return response.data;
  }

  public async update(
    userID: string,
    payload: UserPatchRequest,
  ): Promise<UserUpdateResponse> {
    const response = await this.client.patch(`/users/${userID}`, payload);
    return response.data;
  }

  public async delete(userID: string): Promise<{ message: string }> {
    const response = await this.client.delete(`/users/${userID}`);
    return response.data;
  }

  public async getCustomization(userID: string): Promise<UserCustomization> {
    const response = await this.client.get(`/users/${userID}/customization`);
    return response.data;
  }

  public async getLogs(
    userID: string,
    options?: UserLogsQueryParams,
  ): Promise<UserLogsResponse> {
    const params: Record<string, string> = {};
    if (options?.startTime) {
      params.startTime = options.startTime.toString();
    }
    if (options?.endTime) {
      params.endTime = options.endTime.toString();
    }
    if (options?.limit) {
      params.limit = options.limit.toString();
    }

    const response = await this.client.get(`/users/${userID}/logs`, { params });
    return response.data;
  }

  public async logoutAllSessions(userID: string): Promise<{ message: string }> {
    const response = await this.client.post(
      `/users/${userID}/logout-all-sessions`,
    );
    return response.data;
  }
}
