export type ThingFile = {
  name: string;
  size: number;
  lastModified: number;
  path: string;
};

export type ThingDetails = {
  Object: "Thing";
  ThingID: string;
  Owner: string;
  CreatedAt: number;
  UpdatedAt: number;
  Name: string;
  [key: string]: any;
};

export type ThingPatchRequest = {
  Name?: string;
  [key: string]: any;
};

export type ListThingsResponse = {
  things: ThingDetails[];
  count: number;
};

export type ThingFilesResponse = {
  files: ThingFile[];
  count: number;
};
