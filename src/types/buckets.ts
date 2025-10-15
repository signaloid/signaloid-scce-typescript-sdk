export type BucketDetails = {
  Object: "Bucket";
  BucketID: string;
  Owner: string;
  CreatedAt: number;
  UpdatedAt: number;
  Name: string;
  Account: string;
  MountPath: string;
  Read: boolean;
  Write: boolean;
  Region?: string;
};

export type BucketRequest = {
  Name: string;
  Account: string;
  MountPath?: string;
  Read?: boolean;
  Write?: boolean;
  Region?: string;
};

export type BucketPatchRequest = {
  Name?: string;
  Read?: boolean;
  Write?: boolean;
  Region?: string;
  Account?: string;
  MountPath?: string;
};

export type ListBucketsQueryParams = {
  startKey?: string;
};

export type ListBucketsResponse = {
  user_id: string;
  bucket_ids: string[];
  bucket_count: number;
  // last?: any; // For pagination continuation
};
