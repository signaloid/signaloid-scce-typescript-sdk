import { AxiosInstance } from "axios";
import {
  OrganizationDetails,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  ListOrganizationUsersResponse,
  InviteUserRequest,
  InviteUserResponse,
  UpdateUserRoleRequest,
  UpdateUserRoleResponse,
  RemoveUserResponse,
  ListInvitationsResponse,
} from "../types/organizations";

export class OrganizationsManager {
  constructor(private readonly client: AxiosInstance) {}

  public async get(organizationID: string): Promise<OrganizationDetails> {
    const response = await this.client.get<OrganizationDetails>(
      `/organizations/${organizationID}`,
    );
    return response.data;
  }

  public async create(
    payload: CreateOrganizationRequest,
  ): Promise<CreateOrganizationResponse> {
    const response = await this.client.post<CreateOrganizationResponse>(
      "/organizations",
      payload,
    );
    return response.data;
  }

  public async listUsers(
    organizationID: string,
  ): Promise<ListOrganizationUsersResponse> {
    const response = await this.client.get<ListOrganizationUsersResponse>(
      `/organizations/${organizationID}/users`,
    );
    return response.data;
  }

  public async inviteUser(
    organizationID: string,
    payload: InviteUserRequest,
  ): Promise<InviteUserResponse> {
    const response = await this.client.post<InviteUserResponse>(
      `/organizations/${organizationID}/users`,
      payload,
    );
    return response.data;
  }

  public async updateUserRole(
    organizationID: string,
    userID: string,
    payload: UpdateUserRoleRequest,
  ): Promise<UpdateUserRoleResponse> {
    const response = await this.client.patch<UpdateUserRoleResponse>(
      `/organizations/${organizationID}/users/${userID}`,
      payload,
    );
    return response.data;
  }

  public async removeUser(
    organizationID: string,
    identifier: string,
  ): Promise<RemoveUserResponse> {
    const response = await this.client.delete<RemoveUserResponse>(
      `/organizations/${organizationID}/users/${encodeURIComponent(identifier)}`,
    );
    return response.data;
  }

  public async listInvitations(): Promise<ListInvitationsResponse> {
    const response = await this.client.get<ListInvitationsResponse>(
      "/organizations/invitations",
    );
    return response.data;
  }
}
