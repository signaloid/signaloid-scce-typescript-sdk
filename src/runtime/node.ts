import WebSocket from "ws";
import { useWebSocket } from "./ws";

/** Prepares the SDK for Node by giving the realtime client the ws package's WebSocket. */
export function setupRuntime(): void {
	useWebSocket(WebSocket);
}
