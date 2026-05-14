export type FileListItem = {
  path: string;
  last_modified: number;
  size: number;
  etag: string;
};

export type FileItem = {
  download_url?: string;
  last_modified?: number;
  content_type?: string;
  size?: number;
  owner?: string;
  etag?: string;
};

export type ListFilesResponse = {
  count: number;
  items: FileListItem[];
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
