import { useWebSocket } from "./ws";

/** Prepares the SDK for the browser by giving the realtime client the global WebSocket. */
export function setupRuntime(): void {
	useWebSocket(globalThis.WebSocket);
}
