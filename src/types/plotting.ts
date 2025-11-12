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

export type PlotOptions = {
  fullResolution?: boolean;
  xLimMin?: number;
  xLimMax?: number;
  yLimMin?: number;
  yLimMax?: number;
  xAxisLabel?: string;
};
