/** A Ux string, or a list of numeric samples. */
export type PlotRequest = {
	Payload: string | number[];
};

export type PlotResponse = {
	PlotID: string;
	/** A pre-signed URL for the plot image, valid for about seven days. */
	PresignedURL: string;
};

export type PlotOptions = {
	fullResolution?: boolean;
	xLimMin?: number;
	xLimMax?: number;
	yLimMin?: number;
	yLimMax?: number;
	xAxisLabel?: string;
};
