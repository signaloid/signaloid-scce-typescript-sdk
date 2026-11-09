import type { PaginatedResponse, PaginationQueryParams } from "./pagination";
import type { ResourceType } from ".";

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

/** A task takes at most 50 data sources. */
export type TaskDataSource = {
	Object?: "DataSource";
	/** Relative path inside the guest directory, as for `DataSource.Location`. */
	Location?: string;
	ResourceID: string;
	ResourceType?: ResourceType;
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

export type ListTasksQueryParams = PaginationQueryParams & {
	status?: TaskStatus | TaskStatus[];
	from?: string;
	to?: string;
	noexpand?: boolean;
};

export type ListTasksResponse = PaginatedResponse & {
	UserID: string;
	Count: number;
	Tasks: TaskDetail[];
};

export type TaskSummary = {
	TaskID: string;
	Owner: string;
	CreatedAt: number;
};

export type ListTasksSummaryResponse = PaginatedResponse & {
	UserID: string;
	Count: number;
	Tasks: TaskSummary[];
};

export type ListBuildTasksResponse = PaginatedResponse & {
	BuildID: string;
	Tasks: TaskDetail[];
	Count: number;
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
