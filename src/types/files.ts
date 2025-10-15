export type FileItem = {
  path: string;
  last_modified: number;
  size: number;
  etag: string;
};

export type ListFilesResponse = {
  count: number;
  items: FileItem[];
  nextContinuationToken?: string;
};

export type ListFilesQueryParams = {
  path?: string;
  startKey?: string;
};

export type UploadFileResponse = {
  message: string;
  upload_url?: string;
};

export type CreateDirectoryResponse = {
  message: string;
};

export type DeleteFileResponse = {
  message: string;
};
