export type UserPreferences = {
  UpdatedAt: number;
  Editor_Execution_Arguments?: string;
  Editor_Execution_Core?: string;
  Editor_Execution_DataSources?: string;
  Editor_Layout?: string;
  Editor_Layout_VariableViewer?: string;
  Editor_SourceCode?: string;
  Editor_Theme?: string;
  Execution_DefaultCore?: string;
  Execution_DefaultDataSources?: string;
  Execution_DefaultReferenceCore?: string;
  [key: string]: any;
};

export type UserResourceUsage = {
  APIAccessCount: number;
  BucketCount: number;
  BuildTimeInMillisecondsCount: number;
  CloudStorageBytes: number;
  ConcurrentBuildCount: number;
  ConcurrentTaskCount: number;
  CoreCount: number;
  DataDriveCount: number;
  DataSourceCount: number;
  DynamicInstructionCount: number;
  ExecutionTimeInMillisecondsCount: number;
  GatewayCount: number;
  KeyCount: number;
  PlotCount: number;
  RegistryStorageBytes: number;
  RepositoryCount: number;
  ResetsAt: number;
  TaskCount: number;
  UpdatedAt: number;
  [key: string]: any;
};

export type UserDetails = {
  Object: "User";
  UserID: string;
  Username: string; // Contains the email address
  CreatedAt: number;
  Preferences: UserPreferences;
  ResourceUsage: UserResourceUsage;
  [key: string]: any;
};

export type UserPatchRequestPreferences = {
  Editor_Execution_Arguments?: string;
  Editor_Execution_Core?: string;
  Editor_Execution_DataSources?: string;
  Editor_Layout?: string;
  Editor_Layout_VariableViewer?: string;
  Editor_SourceCode?: string;
  Editor_Theme?: string;
  Execution_DefaultCore?: string;
  Execution_DefaultDataSources?: string;
  Execution_DefaultReferenceCore?: string;
  [key: string]: any;
};

export type UserPatchRequest = {
  Username?: string;
  Email?: string;
  Preferences?: UserPatchRequestPreferences;
  [key: string]: any;
};

export type UserUpdateResponsePreferences = {
  UpdatedAt: number;
  Editor_Execution_Arguments?: string;
  Editor_Execution_Core?: string;
  Editor_Execution_DataSources?: string;
  Editor_Layout?: string;
  Editor_Layout_VariableViewer?: string;
  Editor_SourceCode?: string;
  Editor_Theme?: string;
  Execution_DefaultCore?: string;
  Execution_DefaultDataSources?: string;
  Execution_DefaultReferenceCore?: string;
  [key: string]: any;
};

export type UserUpdateResponse = {
  Preferences: UserUpdateResponsePreferences;
};

export type UserCustomization = {
  Object: "UserCustomization";
  UserID: string;
  LogoURL?: string;
  AtomicNetworks: string[];
  Organizations: string[];
};

export type UserLogsQueryParams = {
  startTime?: number;
  endTime?: number;
  limit?: number;
};

export type UserLogEntry = {
  timestamp: string;
  eventType: string;
  userName: string;
  eventResponse: string;
  ipAddress: string;
  deviceName: string;
  city: string;
  country: string;
};

export type UserLogQueryTimeRange = {
  startTime: number;
  endTime: number;
};

export type UserLogsResponse = {
  logs: UserLogEntry[];
  queryTimeRange: UserLogQueryTimeRange;
  totalResults: number;
};
