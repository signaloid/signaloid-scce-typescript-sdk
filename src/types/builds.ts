import { TraceVariable, DataSource } from ".";

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
  TraceVariables?: TraceVariable[];
  DataSources?: DataSource[];
  Arguments?: string;
};

export type CreateSourceBuildResponse = {
  BuildID: string;
};

export type CreateRepositoryBuildRequest = {
  CoreID?: string;
  TraceVariables?: TraceVariable[];
  DataSources?: DataSource[];
  Arguments?: string;
};

export type CreateRepositoryBuildResponse = {
  BuildID: string;
};

export type ListBuildsResponse = {
  UserID: string;
  Builds: BuildDetails[];
  Count: number;
  ContinuationKey?: string;
};

export type BuildStatusTransition = {
  Status: BuildStatus;
  Timestamp: number;
  Message: string;
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
};

export type Application = {
  Type: "SourceCode" | "Repository";
  SourceCode: SourceCodeApplication;
  Repository: RepositoryApplication;
};

export type BuildCoreSpecs = {
  Class: string;
  Precision: number;
  MemorySize: number;
  Microarchitecture: string;
  CorrelationTracking: string;
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

export type BuildVariablesResponse = {
  BuildID: string;
  Variables: Variable[];
  Count: number;
  ContinuationKey?: string;
};

export type BuildBinaryResponse = {
  url: string;
};

export type BuildOutputs = {
  Build: string;
};
