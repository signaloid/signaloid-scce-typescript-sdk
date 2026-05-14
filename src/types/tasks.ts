export type TaskStatus =
  | "Accepted"
  | "Initialising"
  | "Rescheduled"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Stopped";

export type CreateTaskRequest = {
  Arguments?: string;
  DataSources?: TaskDataSource[];
};

export type CreateTaskResponse = {
  TaskID: string;
};

export type TaskStatusTransition = {
  Status: TaskStatus;
  Timestamp: number;
  Message?: string;
};

export type TaskDataSource = {
  Location?: string;
  ResourceID: string;
  ResourceType: "Gateway" | "Bucket" | "Drive" | "SignaloidCloudStorage";
};

export type TaskStats = {
  DynamicInstructions: number;
  ProcessorTime: number;
  ExecutionTimeInMilliseconds: number;
};

export type TaskDetail = {
  TaskID: string;
  BuildID: string;
  Owner: string;
  Status: TaskStatus;
  StatusTransitions: TaskStatusTransition[];
  Arguments: string;
  DataSources: TaskDataSource[];
  StartedAt: number;
  UpdatedAt: number;
  CreatedAt: number;
  FinishedAt: number;
  IsPublic?: boolean;
  Stats?: TaskStats;
};

export type ListTasksQueryParams = {
  status?: TaskStatus | TaskStatus[];
  startKey?: string;
  from?: string;
  to?: string;
  limit?: number;
  noexpand?: boolean;
};

export type ListTasksResponse = {
  UserID: string;
  Count: number;
  ContinuationKey?: string;
  Tasks: TaskDetail[];
};

export type TaskSummary = {
  TaskID: string;
  Owner: string;
  CreatedAt: number;
};

export type ListTasksSummaryResponse = {
  UserID: string;
  Count: number;
  ContinuationKey?: string;
  Tasks: TaskSummary[];
};

export type ListBuildTasksResponse = {
  BuildID: string;
  Tasks: TaskDetail[];
  Count: number;
  ContinuationKey?: string;
};

export type TaskOutputs = {
  Stdout: string;
  Stderr: string;
  StdoutChunks?: string[];
};

export enum OutputStream {
  Stdout = "Stdout",
  Stderr = "Stderr",
}
