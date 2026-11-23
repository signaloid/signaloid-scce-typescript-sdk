/** A Ux string, or a list of numeric samples. */
export type PlotRequest = {
	Payload: string | number[];
};

export type PlotResponse = {
	PlotID: string;
	/** A pre-signed URL for the plot image, valid for about seven days. */
	PresignedURL: string;
};

/**
 * Axis settings for `plot()` and `plotValue()`. The API refuses a value that breaks a rule below
 * with 400.
 */
export type PlotOptions = {
	/**
	 * The lower end of the X axis range, as a finite number. Set it together with `xLimMax`, and
	 * make it less than `xLimMax`. Leave out both for the default range.
	 */
	xLimMin?: number;
	/** The upper end of the X axis range, as a finite number. Set it together with `xLimMin`. */
	xLimMax?: number;
	/**
	 * The lower end of the Y axis range, as a finite number. Set it together with `yLimMax`, and
	 * make it less than `yLimMax`. Leave out both for the default range.
	 */
	yLimMin?: number;
	/** The upper end of the Y axis range, as a finite number. Set it together with `yLimMin`. */
	yLimMax?: number;
	/**
	 * The label under the X axis, from 1 to 20 characters. A label with an even number of `$`
	 * signs is drawn as math, as in `$\mu$ (s)`, and the API refuses math that cannot be
	 * rendered. Write `\$` for a literal dollar sign.
	 */
	xAxisLabel?: string;
};
