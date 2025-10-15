export type DataSource = {
  Object: "DataSource";
  ResourceID: string;
  ResourceType: "Gateway" | "Bucket" | "SignaloidCloudStorage";
  Location: string;
};

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

export type ListDrivesQueryParams = {
  startKey?: string;
};

export type ListDrivesResponse = {
  user_id: string;
  drive_ids: string[];
  drive_count: number;
};
