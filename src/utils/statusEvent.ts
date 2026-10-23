// Real-time status events carry the entity ID as `taskId`/`buildId`, with older senders using
// `taskID`/`BuildID`, and may be wrapped in a `data` or `event` envelope.
export function parseStatusEvent(msg: any, idKeys: readonly string[]): { id?: string; status?: string } {
	const payload = msg?.data ?? msg?.event ?? msg;
	const idKey = idKeys.find((key) => payload?.[key]);
	const status = payload?.status || payload?.Status;
	return { id: idKey ? payload[idKey] : undefined, status: typeof status === "string" ? status : undefined };
}
