import type { PaginatedResponse, PaginationQueryParams } from "./pagination";
import type { ResourceType, SuccessMessage } from ".";

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
	/**
	 * The longest the program may run, in seconds, from 1 to 28800 (8 hours). Leave it out for
	 * the platform maximum of 8 hours. It does not count the time Signaloid takes to set up the
	 * run. A Task that runs longer ends with the status `Stopped`, and `getStopReason()`
	 * returns `ErrMaxDurationExceeded` for it. Tasks do not take this limit from their Build.
	 */
	MaxDurationSeconds?: number;
};

export type CreateTaskResponse = {
	TaskID: string;
} & SuccessMessage;

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
	/** The limit set when the Task was created. Absent means the platform maximum of 8 hours. */
	MaxDurationSeconds?: number;
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
