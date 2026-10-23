import type { Tier, TierCapabilities } from "./tiers";

export type UserPreferences = {
	UpdatedAt: number;
	Editor_Compilation_Flags?: string;
	Editor_Execution_Arguments?: string;
	Editor_Execution_CodeLanguage?: string;
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
	AnchorDay?: number;
	TaskCount: number;
	UpdatedAt: number;
	[key: string]: any;
};

/** Onboarding flags, plus an `UpdatedAt` the server sets in Unix seconds. */
export type UserOnboardingState = Record<string, boolean | number>;

export type UserDetails = TierCapabilities & {
	Object: "User";
	UserID: string;
	Username: string; // Contains the email address
	CreatedAt: number;
	Preferences: UserPreferences;
	ResourceUsage: UserResourceUsage;
	OnboardingState?: UserOnboardingState;
	Role?: string | null;
	Industry?: string | null;
	Tier: Tier;
	[key: string]: any;
};

/** A closed set: the API refuses any other preference key with 400. */
export type UserPatchRequestPreferences = {
	Editor_Compilation_Flags?: string;
	Editor_Execution_Arguments?: string;
	Editor_Execution_CodeLanguage?: string;
	Editor_Execution_Core?: string;
	Editor_Execution_DataSources?: string;
	Editor_Layout?: string;
	Editor_Layout_VariableViewer?: string;
	Editor_SourceCode?: string;
	Editor_Theme?: string;
	Execution_DefaultCore?: string;
	Execution_DefaultDataSources?: string;
	Execution_DefaultReferenceCore?: string;
};

export type UserPatchRequest = {
	Preferences?: UserPatchRequestPreferences;
	// at most 50 keys, merged into the stored map
	OnboardingState?: Record<string, boolean>;
	// null clears the stored value, an omitted key leaves it unchanged
	Role?: string | null;
	Industry?: string | null;
};

// the only preferences the API removes; it ignores any other ?remove= value
export type UserPatchRemovableField = "Editor_Execution_Core" | "Editor_Execution_DataSources";

export type UserUpdateResponsePreferences = {
	UpdatedAt: number;
	Editor_Compilation_Flags?: string;
	Editor_Execution_Arguments?: string;
	Editor_Execution_CodeLanguage?: string;
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
	// the API returns only the attributes touched by the patch
	Preferences?: UserUpdateResponsePreferences;
	OnboardingState?: UserOnboardingState;
	Role?: string;
	Industry?: string;
};

/**
 * For a member of a branded organization without a customization of their own, the API builds
 * this object from the organization, so `Object` and `LogoURL` are absent and `Organizations`
 * holds the organization's branding key.
 */
export type UserCustomization = {
	Object?: "UserCustomization";
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
