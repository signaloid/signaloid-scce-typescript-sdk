export type SamplesResponse = {
  Samples: number[];
  Count: number;
};

export type SamplesQueryParams = {
  count?: number;
  taskID?: string;
  valueID?: string;
};
