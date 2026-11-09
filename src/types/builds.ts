import type { PaginatedResponse, PaginationQueryParams } from "./pagination";
import { TraceVariable, DataSource } from ".";
import type { DependencyTracking, LegacyCorrelationTracking, StoredMicroarchitecture } from "./cores";

export type BuildStatus =
	| "Accepted"
	| "Initialising"
	| "In Progress"
	| "Completed"
	| "Cancelled"
	| "Stopped"
	| "Rescheduled";

export type CreateSourceBuildRequest = {
	Code: string;
	Language: "C" | "C++" | "Fortran";
	CoreID?: string;
	/** Must be empty for the `r7i` Core class. */
	TraceVariables?: TraceVariable[];
	/** Must be empty for the C0-microSD, C0-microSD-plus and C0-SD Core classes. */
	DataSources?: DataSource[];
	Arguments?: string;
	IsPublic?: boolean;
	ConfigMk?: string;
};

export type CreateSourceBuildResponse = {
	BuildID: string;
};

export type CreateRepositoryBuildRequest = {
	CoreID?: string;
	/** Must be empty for the `r7i` Core class. */
	TraceVariables?: TraceVariable[];
	/** Must be empty for the C0-microSD, C0-microSD-plus and C0-SD Core classes. */
	DataSources?: DataSource[];
	Arguments?: string;
	IsPublic?: boolean;
};

export type CreateRepositoryBuildResponse = {
	BuildID: string;
};

export type ListBuildsQueryParams = PaginationQueryParams & {
	from?: string;
	to?: string;
	status?: BuildStatus | BuildStatus[];
};

export type ListBuildTasksQueryParams = PaginationQueryParams & {
	from?: string;
	to?: string;
};

export type ListBuildsResponse = PaginatedResponse & {
	UserID: string;
	Builds: BuildDetails[];
	Count: number;
};

export type BuildSummary = {
	BuildID: string;
	Owner: string;
	CreatedAt: number;
};

export type ListBuildsSummaryResponse = PaginatedResponse & {
	UserID: string;
	Builds: BuildSummary[];
	Count: number;
};

export type BuildStatusTransition = {
	Status: BuildStatus;
	Timestamp: number;
	Message?: string;
};

export type RepositoryApplication = {
	Object: string;
	RepositoryID: string;
	Owner: string;
	RemoteURL: string;
	Commit: string;
	Branch: string;
	BuildDirectory: string;
	Arguments: string;
	Core: string;
	DataSources: DataSource[];
	TraceVariables: TraceVariable[];
	CreatedAt: number;
	UpdatedAt: number;
};

export type SourceCodeApplication = {
	Code: string;
	Language: string;
	Arguments: string;
	ConfigMk?: string;
};

export type Application = {
	Type: "SourceCode" | "Repository";
	SourceCode: SourceCodeApplication;
	Repository: RepositoryApplication;
};

export type BuildCoreSpecs = {
	Class: string;
	Precision: number;
	/** In bytes. Fixed per Core class and assigned by the server. */
	MemorySize: number;
	Microarchitecture: StoredMicroarchitecture;
	/** Set on builds accepted since the API renamed `CorrelationTracking` to `DependencyTracking`. */
	DependencyTracking?: DependencyTracking;
	/** @deprecated Set only on older builds, as the record of what they ran with. */
	CorrelationTracking?: LegacyCorrelationTracking;
};

export type BuildStats = {
	BuildTimeInMilliseconds: number;
	BuildSizeInBytes: number;
	CreatedAt: number;
};

export type BuildDetails = {
	BuildID: string;
	Owner: string;
	Status: BuildStatus;
	StatusTransitions?: BuildStatusTransition[];
	StartedAt?: number;
	DefaultArguments?: string;
	DefaultDataSources?: DataSource[];
	Application: Application;
	UpdatedAt?: number;
	CreatedAt?: number;
	FinishedAt?: number;
	BuildArtifactAvailable?: boolean;
	BuildCoreSpecs?: BuildCoreSpecs;
	TraceVariables?: TraceVariable[];
	IsPublic?: boolean;
	Stats?: BuildStats;
};

export type Variable = {
	Object: string;
	Name: string;
	Type: string;
	File: string;
	Line: number;
	Function: string;
};

export type BuildVariablesQueryParams = PaginationQueryParams;

export type BuildVariablesResponse = PaginatedResponse & {
	BuildID: string;
	Variables: Variable[];
	Count: number;
};

/**
 * A pre-signed URL, valid for one hour. It serves the binary as an attachment named
 * `<BuildID>.bin`, so a browser downloads it rather than displays it.
 */
export type BuildBinaryResponse = {
	url: string;
};

/** A pre-signed URL to the build's `buildArtifacts.tar.gz` archive. */
export type BuildArtifactsResponse = BuildBinaryResponse;

export type BuildOutputs = {
	Build: string;
};

export type UpdateBuildRequest = {
	IsPublic: boolean;
};
