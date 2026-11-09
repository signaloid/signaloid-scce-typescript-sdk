import type { PaginatedResponse, PaginationQueryParams } from "./pagination";
import type { AtLeastOne } from ".";

export type BucketDetails = {
	Object: "Bucket";
	BucketID: string;
	Owner: string;
	CreatedAt: number;
	UpdatedAt: number;
	Name: string;
	Account: string;
	Read: boolean;
	Write: boolean;
};

export type BucketRequest = {
	Name: string;
	Account: string;
	Read?: boolean;
	Write?: boolean;
};

export type BucketPatchRequest = AtLeastOne<{
	Name: string;
	Read: boolean;
	Write: boolean;
	Account: string;
}>;

export type ListBucketsQueryParams = PaginationQueryParams;

export type ListBucketsResponse = PaginatedResponse & {
	UserID: string;
	BucketIDs: string[];
	/** The number of Buckets in this page. */
	Count: number;
};
