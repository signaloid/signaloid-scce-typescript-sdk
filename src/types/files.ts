import type { PaginatedResponse, PaginationQueryParams } from "./pagination";

export type FileListItem = {
	/** Path relative to the user's storage root. Directories end with `/`. */
	Path: string;
	/** Unix timestamp in milliseconds. */
	LastModified: number;
	/** Size in bytes. */
	Size: number;
	ETag: string;
};

export type FileItem = {
	/** Pre-signed download URL. Present only when the request asks for a download. */
	DownloadURL?: string;
	/** Unix timestamp in milliseconds. */
	LastModified?: number;
	ContentType?: string;
	/** Size in bytes. */
	Size?: number;
	Owner?: string;
	ETag?: string;
};

export type ListFilesResponse = PaginatedResponse & {
	Count: number;
	Files: FileListItem[];
};

export type ListFilesQueryParams = PaginationQueryParams & {
	path?: string;
};

export type UploadFileResponse = {
	/** Pre-signed URL to upload the file content to with an HTTP PUT. */
	UploadURL: string;
};

export type CreateDirectoryResponse = {
	message: string;
};

export type DeleteFileResponse = {
	message: string;
};
