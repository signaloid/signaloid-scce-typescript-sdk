import { AxiosInstance } from "axios";
import {
  GitHubIntegration,
  GitHubIntegrationRequest,
  GitHubIntegrationCreateResponse,
} from "../types/github";

export class GitHubManager {
  constructor(private readonly client: AxiosInstance) {}

  public async getIntegration(userID: string): Promise<GitHubIntegration> {
    const response = await this.client.get(
      `/users/${userID}/integrations/github`,
    );
    return response.data;
  }

  public async createOrUpdateIntegration(
    userID: string,
    payload: GitHubIntegrationRequest,
  ): Promise<GitHubIntegrationCreateResponse> {
    const response = await this.client.put<{ message: string }>(
      `/users/${userID}/integrations/github`,
      payload,
    );
    return { Message: response.data.message };
  }

  public async deleteIntegration(userID: string): Promise<{ Message: string }> {
    const response = await this.client.delete<{ message: string }>(
      `/users/${userID}/integrations/github`,
    );
    return { Message: response.data.message };
  }

  public async proxyRequest(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  ): Promise<any> {
    const response = await this.client.request({
      method,
      url: `/proxy/github/${path}`,
    });
    return response.data;
  }
}
