import { AxiosInstance } from "axios";
import axios from "axios";
import {
  FileItem,
  ListFilesResponse,
  ListFilesQueryParams,
  UploadFileResponse,
  CreateDirectoryResponse,
  DeleteFileResponse,
} from "../types/files";

export class FilesManager {
  constructor(private readonly client: AxiosInstance) {}

  public async list(
    options?: ListFilesQueryParams,
  ): Promise<ListFilesResponse> {
    const params: Record<string, string> = {};
    if (options?.path) {
      params.path = options.path;
    }
    if (options?.startKey) {
      params.startKey = options.startKey;
    }

    const response = await this.client.get("/files", { params });
    return response.data;
  }

  public async get(path: string, download?: boolean): Promise<FileItem | Blob> {
    const params: Record<string, string> = {};
    if (download) {
      params.download = "true";
    }

    const response = await this.client.get(`/files/${path}`, {
      params,
      ...(download && { responseType: "blob" }),
    });
    return response.data;
  }

  public async upload(
    path: string,
    content: File | Blob | ArrayBuffer | string,
  ): Promise<{ message: string }> {
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

    const params: Record<string, string> = {
      size: size.toString(),
    };

    // Get presigned URL from API
    const response = await this.client.put(`/files/${path}`, null, { params });
    const uploadData = response.data as UploadFileResponse;

    // If we get a presigned URL, use it to upload the file
    if (uploadData.upload_url) {
      // Convert content to appropriate format for upload
      let uploadContent: Blob | ArrayBuffer | string = content;

      if (typeof content === "string") {
        uploadContent = new Blob([content], { type: "text/plain" });
      }

      // Upload to the presigned URL
      const uploadResponse = await axios.put(
        uploadData.upload_url,
        uploadContent,
        {
          headers: {
            "Content-Type": "application/octet-stream",
          },
        },
      );

      return { message: "File uploaded successfully" };
    }

    // If no presigned URL, assume direct upload worked
    return { message: uploadData.message || "File uploaded successfully" };
  }

  public async createDirectory(path: string): Promise<CreateDirectoryResponse> {
    const params: Record<string, string> = {
      directory: "true",
    };

    const response = await this.client.put(`/files/${path}`, null, { params });
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

    const response = await this.client.delete(`/files/${path}`, { params });
    return response.data;
  }
}
