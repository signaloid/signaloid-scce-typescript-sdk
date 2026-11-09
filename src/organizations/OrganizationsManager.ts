import { AxiosInstance } from "axios";
import {
	OrganizationDetails,
	CreateOrganizationRequest,
	CreateOrganizationResponse,
	ListOrganizationUsersQueryParams,
	ListOrganizationUsersResponse,
	InviteUserRequest,
	InviteUserResponse,
	UpdateUserRoleRequest,
	UpdateUserRoleResponse,
	RemoveUserResponse,
	ListInvitationsQueryParams,
	ListInvitationsResponse,
	OrganizationInvitation,
	OrganizationPendingUser,
	OrganizationUser,
} from "../types/organizations";
import { paginationParams } from "../utils/listParams";
import { listAllItems } from "../utils/paginate";
import type { ListAllOptions } from "../types/pagination";

export class OrganizationsManager {
	constructor(private readonly client: AxiosInstance) {}

	public async get(organizationID: string): Promise<OrganizationDetails> {
		const response = await this.client.get<OrganizationDetails>(`/organizations/${organizationID}`);
		return response.data;
	}

	public async create(payload: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
		const response = await this.client.post<CreateOrganizationResponse>("/organizations", payload);
		return response.data;
	}

	/**
	 * One page of active members, or of pending invitations with `status: "Pending"`. Each list
	 * is paged on its own: follow `Pagination.Links.Next.Cursor` with `cursor` and the same `status`.
	 */
	public async listUsers(
		organizationID: string,
		options: ListOrganizationUsersQueryParams & { status: "Pending" },
	): Promise<ListOrganizationUsersResponse<OrganizationPendingUser>>;
	public async listUsers(
		organizationID: string,
		options?: ListOrganizationUsersQueryParams & { status?: "Active" },
	): Promise<ListOrganizationUsersResponse<OrganizationUser>>;
	public async listUsers(
		organizationID: string,
		options?: ListOrganizationUsersQueryParams,
	): Promise<ListOrganizationUsersResponse>;
	public async listUsers(
		organizationID: string,
		options?: ListOrganizationUsersQueryParams,
	): Promise<ListOrganizationUsersResponse> {
		const response = await this.client.get<
			ListOrganizationUsersResponse & { Pending?: OrganizationPendingUser[] }
		>(`/organizations/${organizationID}/users`, {
			// Always sent: without it, the API returns the legacy response with both lists whole.
			params: { ...paginationParams(options), status: options?.status ?? "Active" },
		});
		const data = response.data;
		// An API without paginated lists ignores `status` and returns both lists whole. Keep
		// the one asked for, so `Pending` callers do not get the active members. Remove this
		// once every deployed API pages organization users.
		if (!data.Pagination) {
			const users = options?.status === "Pending" ? (data.Pending ?? []) : data.Users;
			return { Users: users, Count: users.length };
		}
		return data;
	}

	/** Every active member, or every pending invitation with `status: "Pending"`, across all pages. */
	public async listAllUsers(
		organizationID: string,
		options: ListAllOptions<ListOrganizationUsersQueryParams> & { status: "Pending" },
	): Promise<OrganizationPendingUser[]>;
	public async listAllUsers(
		organizationID: string,
		options?: ListAllOptions<ListOrganizationUsersQueryParams> & { status?: "Active" },
	): Promise<OrganizationUser[]>;
	public async listAllUsers(
		organizationID: string,
		options?: ListAllOptions<ListOrganizationUsersQueryParams>,
	): Promise<(OrganizationUser | OrganizationPendingUser)[]>;
	public async listAllUsers(
		organizationID: string,
		options?: ListAllOptions<ListOrganizationUsersQueryParams>,
	): Promise<(OrganizationUser | OrganizationPendingUser)[]> {
		return listAllItems(
			(query: ListOrganizationUsersQueryParams) => this.listUsers(organizationID, query),
			options,
			(page) => page.Users,
		);
	}

	public async inviteUser(organizationID: string, payload: InviteUserRequest): Promise<InviteUserResponse> {
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

	public async removeUser(organizationID: string, identifier: string): Promise<RemoveUserResponse> {
		const response = await this.client.delete<RemoveUserResponse>(
			`/organizations/${organizationID}/users/${encodeURIComponent(identifier)}`,
		);
		return response.data;
	}

	/** One page of your invitations. See `cursor` for the next one. */
	public async listInvitations(options?: ListInvitationsQueryParams): Promise<ListInvitationsResponse> {
		const response = await this.client.get<ListInvitationsResponse>("/organizations/invitations", {
			params: paginationParams(options),
		});
		return response.data;
	}

	/** Every invitation of yours across all pages. */
	public async listAllInvitations(
		options?: ListAllOptions<ListInvitationsQueryParams>,
	): Promise<OrganizationInvitation[]> {
		return listAllItems(
			(query) => this.listInvitations(query),
			options,
			(page) => page.Invitations,
		);
	}
}
