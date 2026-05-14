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
    const response = await this.client.put<GitHubIntegrationCreateResponse>(
      `/users/${userID}/integrations/github`,
      payload,
    );
    return response.data;
  }

  public async deleteIntegration(userID: string): Promise<{ message: string }> {
    const response = await this.client.delete(
      `/users/${userID}/integrations/github`,
    );
    return response.data;
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
