import type { SuccessMessage } from ".";
import type { Tier, TierCapabilities } from "./tiers";
import type { CursorPaginatedResponse, CursorQueryParams } from "./pagination";

export type OrganizationRole = "Owner" | "Member";
export type OrganizationUserStatus = "Active" | "Pending";

export type OrganizationResourceUsage = {
	APIAccessCount: number;
	BuildTimeInMillisecondsCount: number;
	CloudStorageBytes: number;
	ConcurrentBuildCount: number;
	ConcurrentTaskCount: number;
	DynamicInstructionCount: number;
	ExecutionTimeInMillisecondsCount: number;
	KeyCount: number;
	PlotCount: number;
	RegistryStorageBytes: number;
	ResetsAt: number;
	AnchorDay?: number;
	UpdatedAt: number;
};

export type OrganizationStatistics = {
	TotalUserCount: number;
	OwnerCount: number;
	MemberCount: number;
};

export type OrganizationDetails = TierCapabilities & {
	OrganizationID: string;
	Name: string;
	Tier: Tier;
	DedicatedInstance: boolean;
	DedicatedInstanceName?: string;
	ResourceUsage: OrganizationResourceUsage;
	Statistics: OrganizationStatistics;
	CreatedAt: string;
	UpdatedAt: string;
};

export type CreateOrganizationRequest = {
	Name: string;
	DedicatedInstanceName?: string;
};

export type CreateOrganizationResponse = {
	OrganizationID: string;
	Name: string;
	Tier: Tier;
	Role: OrganizationRole;
	DedicatedInstance: boolean;
	DedicatedInstanceName?: string;
	CreatedAt: string;
} & SuccessMessage;

export type OrganizationUser = {
	UserID: string;
	/** Missing on members added before the API stored it. */
	OrganizationID?: string;
	Email: string;
	Username: string;
	Role: OrganizationRole;
	Status: "Active";
	Tier: string;
	JoinedAt: string;
	UpdatedAt: string;
};

export type OrganizationPendingUser = {
	Email: string;
	Role: OrganizationRole;
	Status: "Pending";
	CreatedAt: string;
	UpdatedAt: string;
};

export type ListOrganizationUsersQueryParams = CursorQueryParams & {
	/** Which list to return: active members (the default) or pending invitations. Each is paged on its own. */
	status?: OrganizationUserStatus;
};

/**
 * One page of active members, or of pending invitations with `status: "Pending"`. `listUsers()`
 * narrows `U` to the list that `status` selects.
 */
export type ListOrganizationUsersResponse<
	U extends OrganizationUser | OrganizationPendingUser = OrganizationUser | OrganizationPendingUser,
> = CursorPaginatedResponse & {
	Users: U[];
	Count: number;
};

export type InviteUserRequest = {
	Email: string;
	Role: OrganizationRole;
};

export type InviteUserResponse = {
	UserID?: string;
	Email: string;
	Role: OrganizationRole;
	Status?: string;
} & SuccessMessage;

export type UpdateUserRoleRequest = {
	Role: OrganizationRole;
};

export type UpdateUserRoleResponse = {
	UserID: string;
	PreviousRole?: OrganizationRole;
	NewRole?: OrganizationRole;
	Role?: OrganizationRole;
} & SuccessMessage;

export type RemoveUserResponse = {
	Type: "Active" | "Pending";
	UserID?: string;
	Email?: string;
	RemovedRole: OrganizationRole;
} & SuccessMessage;

export type OrganizationInvitation = {
	OrganizationID: string;
	OrganizationName: string;
	DedicatedInstanceName: string;
	Tier: string;
	Email: string;
	Role: OrganizationRole;
	Status: string;
	InvitedAt: string;
	InvitedBy?: string;
};

export type ListInvitationsQueryParams = CursorQueryParams;

export type ListInvitationsResponse = CursorPaginatedResponse & {
	Invitations: OrganizationInvitation[];
	Count: number;
};
