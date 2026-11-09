import axios, { AxiosInstance } from "axios";
import {
	FileItem,
	FileListItem,
	ListFilesResponse,
	ListFilesQueryParams,
	UploadFileResponse,
	CreateDirectoryResponse,
	DeleteFileResponse,
} from "../types/files";
import { paginationParams } from "../utils/listParams";
import { listAllItems } from "../utils/paginate";
import type { ListAllOptions } from "../types/pagination";

export function encodeStoragePath(path: string): string {
	return path.split("/").map(encodeURIComponent).join("/");
}

export class FilesManager {
	constructor(private readonly client: AxiosInstance) {}

	/** One page of Files. See `cursor` for the next one. */
	public async list(options?: ListFilesQueryParams): Promise<ListFilesResponse> {
		const params = paginationParams(options);
		if (options?.path) {
			params.path = options.path;
		}

		const response = await this.client.get("/files", { params });
		return response.data;
	}

	/** Every File under `path` across all pages, read 100 per page unless `limit` says otherwise. */
	public async listAll(options?: ListAllOptions<ListFilesQueryParams>): Promise<FileListItem[]> {
		return listAllItems(
			(query) => this.list(query),
			options,
			(page) => page.Files,
		);
	}

	public async get(path: string, download?: boolean): Promise<FileItem | Blob> {
		const params: Record<string, string> = {};
		if (download) {
			params.download = "true";
		}

		const response = await this.client.get(`/files/${encodeStoragePath(path)}`, {
			params,
			...(download && { responseType: "blob" }),
		});
		return response.data;
	}

	public async upload(path: string, content: File | Blob | ArrayBuffer | string): Promise<{ message: string }> {
		// Calculate size based on content type
		let size: number;
		if (typeof content === "string") {
			size = new TextEncoder().encode(content).length;
		} else if (content instanceof File || content instanceof Blob) {
			size = content.size;
		} else if (content instanceof ArrayBuffer) {
			size = content.byteLength;
		} else {
			throw new Error("Unsupported content type");
		}
		if (size === 0) {
			throw new Error("Cannot upload an empty file: the API requires at least 1 byte");
		}

		const params: Record<string, string> = {
			size: size.toString(),
		};

		// Get presigned URL from API
		const response = await this.client.put(`/files/${encodeStoragePath(path)}`, null, { params });
		const uploadData = response.data as UploadFileResponse;

		// Without a presigned URL nothing has been uploaded, so fail rather than report success.
		if (!uploadData.UploadURL) {
			throw new Error("The API did not return an UploadURL for the file upload");
		}

		// Convert content to appropriate format for upload
		let uploadContent: Blob | ArrayBuffer | string = content;

		if (typeof content === "string") {
			uploadContent = new Blob([content], { type: "text/plain" });
		}

		// Upload to the presigned URL. axios rejects on a non-2xx status.
		await axios.put(uploadData.UploadURL, uploadContent, {
			headers: {
				"Content-Type": "application/octet-stream",
			},
		});

		return { message: "File uploaded successfully" };
	}

	public async createDirectory(path: string): Promise<CreateDirectoryResponse> {
		const params: Record<string, string> = {
			directory: "true",
		};

		const response = await this.client.put(`/files/${encodeStoragePath(path)}`, null, { params });
		return response.data;
	}

	public async delete(
		path: string,
		options?: { recursive?: boolean; directory?: boolean },
	): Promise<DeleteFileResponse> {
		const params: Record<string, string> = {};
		if (options?.recursive) {
			params.recursive = "true";
		}
		if (options?.directory) {
			params.directory = "true";
		}

		const response = await this.client.delete(`/files/${encodeStoragePath(path)}`, { params });
		return response.data;
	}
}
