import type { PaginatedResponse, PaginationQueryParams } from "./pagination";
import { TraceVariable, DataSource } from ".";
import { BuildDetails } from "./builds";

export type RepositoryRequest = {
	RemoteURL: string;
	Commit: string;
	Branch: string;
	BuildDirectory: string;
	Arguments?: string;
	/** Omit it to use the lowest-precision `C0Pro` default Core. */
	Core?: string;
	DataSources?: DataSource[];
	/** Ignored by builds on an `r7i` Core, which cannot trace variables. */
	TraceVariables?: TraceVariable[];
};

export type RepositoryPatchRequest = {
	RemoteURL?: string;
	Commit?: string;
	Branch?: string;
	BuildDirectory?: string;
	Arguments?: string;
	Core?: string;
	DataSources?: DataSource[];
	/** Ignored by builds on an `r7i` Core, which cannot trace variables. */
	TraceVariables?: TraceVariable[];
};

// the only fields the API removes; with ?remove= the request body is ignored
export type RepositoryPatchRemovableField = "DataSources" | "Core" | "TraceVariables";

export type Override = {
	Variable: string;
	Value: string;
	ValueIndex?: number;
};

export type PostKeysRequest = {
	InputKeys: string[];
	Overrides?: Override[];
};

export type RepositoryDetails = {
	Object: "Repository";
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

export type ListRepositoriesQueryParams = PaginationQueryParams;

export type ListRepositoriesResponse = PaginatedResponse & {
	UserID: string;
	Repositories: RepositoryDetails[];
	Count: number;
};

export type GetRepositoryBuildsQueryParams = PaginationQueryParams & {
	from?: string;
	to?: string;
};

export type ListBuildsByRepositoryResponse = PaginatedResponse & {
	RepositoryID: string;
	Builds: BuildDetails[];
	Count: number;
};

export type LookupRepositoryRequest = {
	RemoteURL: string;
	Branch: string;
};

export type LookupRepositoryResponse = {
	RepositoryID: string;
};
