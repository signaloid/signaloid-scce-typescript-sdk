export type ThingFileItem = {
  file: string;
  updated_at: number;
};

export type ThingDetails = {
  Object: "Thing";
  ThingID: string;
  Owner: string;
  CreatedAt: number;
  UpdatedAt: number;
  Name: string;
  ThingStatus?: any;
  Presence?: any;
  Topics?: string[];
  [key: string]: any;
};

export type ThingPatchRequest = {
  Name: string;
  [key: string]: any;
};

export type ListThingsResponse = {
  user_id: string;
  thing_ids: string[];
  thing_count: number;
};

export type ThingFilesResponse = {
  user_id: string;
  thing_id: string;
  items: ThingFileItem[];
};
