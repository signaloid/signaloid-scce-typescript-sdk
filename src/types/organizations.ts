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
  UpdatedAt: number;
};

export type OrganizationStatistics = {
  TotalUserCount: number;
  OwnerCount: number;
  MemberCount: number;
};

export type OrganizationDetails = {
  OrganizationID: string;
  Name: string;
  Tier: string;
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
  Message: string;
  OrganizationID: string;
  Name: string;
  Tier: string;
  Role: OrganizationRole;
  DedicatedInstance: boolean;
  DedicatedInstanceName?: string;
  CreatedAt: string;
};

export type OrganizationUser = {
  UserID: string;
  Email: string;
  Username: string;
  Role: OrganizationRole;
  Status: OrganizationUserStatus;
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

export type ListOrganizationUsersResponse = {
  Users: OrganizationUser[];
  Pending: OrganizationPendingUser[];
  ActiveCount: number;
  PendingCount: number;
  TotalCount: number;
};

export type InviteUserRequest = {
  Email: string;
  Role: OrganizationRole;
};

export type InviteUserResponse = {
  Message: string;
  UserID?: string;
  Email: string;
  Role: OrganizationRole;
  Status?: string;
};

export type UpdateUserRoleRequest = {
  Role: OrganizationRole;
};

export type UpdateUserRoleResponse = {
  Message: string;
  UserID: string;
  PreviousRole?: OrganizationRole;
  NewRole?: OrganizationRole;
  Role?: OrganizationRole;
};

export type RemoveUserResponse = {
  Message: string;
  Type: "Active" | "Pending";
  UserID?: string;
  Email?: string;
  RemovedRole: OrganizationRole;
};

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

export type ListInvitationsResponse = {
  Invitations: OrganizationInvitation[];
  Count: number;
};
