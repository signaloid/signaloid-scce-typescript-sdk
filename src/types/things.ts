export type ThingFileItem = {
  File: string;
  UpdatedAt: number;
};

export type ThingDetails = {
  Object: "Thing";
  ThingID: string;
  Owner: string;
  CreatedAt: number;
  UpdatedAt: number;
  Name: string;
  ThingStatus?: unknown;
  Presence?: unknown;
  Topics?: string[];
  [key: string]: unknown;
};

export type ThingPatchRequest = {
  Name: string;
  [key: string]: unknown;
};

export type ListThingsResponse = {
  UserID: string;
  ThingIDs: string[];
  ThingCount: number;
};

export type ThingFilesResponse = {
  UserID: string;
  ThingID: string;
  Items: ThingFileItem[];
};
