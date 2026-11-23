import { getEnvironment } from "../config/environment";

/** Default endpoints, read on each call so that SIGNALOID_ENV_VARS set after import apply. */
export function getDefaultEndpoints() {
	const env = getEnvironment();

	return {
		api: env.api,
		websocket: env.websocket,
		host: env.host,
		publicWebsocket: env.publicWebsocket,
		publicHost: env.publicHost,
	};
}
