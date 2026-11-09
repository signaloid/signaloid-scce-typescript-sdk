import type { PaginatedResponse, PaginationQueryParams } from "./pagination";
import { DataSource } from ".";

export type DriveDetails = {
	Object: "Drive";
	DriveID: string;
	Owner: string;
	CreatedAt: number;
	UpdatedAt: number;
	Name: string;
	DataSources: DataSource[];
};

export type DriveRequest = {
	Name: string;
	DataSources: DataSource[];
};

export type DrivePatchRequest = {
	Name?: string;
	DataSources?: DataSource[];
};

export type ListDrivesQueryParams = PaginationQueryParams;

export type ListDrivesResponse = PaginatedResponse & {
	UserID: string;
	DriveIDs: string[];
	/** The number of Drives in this page. */
	Count: number;
};
