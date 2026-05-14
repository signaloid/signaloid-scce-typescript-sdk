import { TraceVariable, DataSource } from ".";
import { BuildDetails } from "./builds";

export type RepositoryRequest = {
  RemoteURL: string;
  Commit: string;
  Branch: string;
  BuildDirectory: string;
  Arguments?: string;
  Core?: string;
  DataSources?: DataSource[];
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
  TraceVariables?: TraceVariable[];
};

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

export type ListRepositoriesResponse = {
  UserID: string;
  Repositories: RepositoryDetails[];
  Count: number;
  ContinuationKey?: string;
};

export type GetRepositoryBuildsQueryParams = {
  startKey?: string;
  from?: string;
  to?: string;
};

export type ListBuildsByRepositoryResponse = {
  RepositoryID: string;
  Builds: BuildDetails[];
  Count: number;
  ContinuationKey?: string;
};

export type LookupRepositoryRequest = {
  RemoteURL: string;
  Branch: string;
};

export type LookupRepositoryResponse = {
  RepositoryID: string;
};
