import { AxiosInstance } from "axios";
import { PlotOptions, PlotRequest, PlotResponse } from "../types/plotting";

function buildPlotQuery(options?: PlotOptions): Record<string, string> {
	const q: Record<string, string> = {};
	if (!options) return q;
	if (typeof options.fullResolution === "boolean") {
		q.fullResolution = String(options.fullResolution);
	}
	if (typeof options.xLimMin === "number") q.xLimMin = String(options.xLimMin);
	if (typeof options.xLimMax === "number") q.xLimMax = String(options.xLimMax);
	if (typeof options.yLimMin === "number") q.yLimMin = String(options.yLimMin);
	if (typeof options.yLimMax === "number") q.yLimMax = String(options.yLimMax);
	if (typeof options.xAxisLabel === "string") q.xAxisLabel = options.xAxisLabel;
	return q;
}

export class PlottingManager {
	constructor(private readonly client: AxiosInstance) {}

	public async plot(uxPayload: PlotRequest["payload"], options?: PlotOptions): Promise<PlotResponse> {
		if (!uxPayload?.length) throw new Error("plot requires a non-empty Ux payload or sample list");
		const response = await this.client.post<PlotResponse>(
			"/plot",
			{ payload: uxPayload },
			{
				params: buildPlotQuery(options),
				headers: { "Content-Type": "application/json" },
			},
		);
		return response.data;
	}

	public async plotValue(taskID: string, valueID: string, options?: PlotOptions): Promise<PlotResponse> {
		if (!taskID || !valueID) {
			throw new Error("plotValue requires both taskID and valueID");
		}
		const url = `/tasks/${encodeURIComponent(taskID)}/values/${encodeURIComponent(valueID)}/plot`;
		const response = await this.client.post<PlotResponse>(url, undefined, {
			params: buildPlotQuery(options),
			headers: { "Content-Type": "application/json" },
		});
		return response.data;
	}
}
