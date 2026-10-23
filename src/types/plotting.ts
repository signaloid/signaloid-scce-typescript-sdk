/** A Ux string, or a list of numeric samples. */
export type PlotRequest = {
	payload: string | number[];
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
