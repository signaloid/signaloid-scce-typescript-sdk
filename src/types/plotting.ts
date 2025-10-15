export type PlotRequest = {
  taskID?: string;
  valueID?: string;
  payload?: string;
  data?: any;
};

export type PlotResponse = {
  plotID: string;
  presignedURL: string;
};

export type PlotValueRequest = {
  taskID: string;
  valueID: string;
};

export type PlotValueResponse = {
  plotID: string;
  presignedURL: string;
};

export type PlotUxRequest = {
  payload: string;
};

export type PlotUxResponse = {
  plotID: string;
  presignedURL: string;
};

export type SamplesUxRequest = {
  payload: string;
};

export type SamplesUxResponse = {
  Samples: number[];
  Count: number;
};
