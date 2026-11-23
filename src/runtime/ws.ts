/**
 * The parts of a WebSocket class the realtime client uses. Both the browser's global
 * WebSocket and the ws package's WebSocket match it.
 */
export interface WebSocketClassInterface {
	new (url: string, protocols?: string | string[]): unknown;
	readonly OPEN?: number;
	readonly CONNECTING?: number;
}

/** The WebSocket class the realtime client opens, set by the entry point for its runtime. */
export let WSClass: WebSocketClassInterface | undefined;

/**
 * Sets the WebSocket class the realtime client opens.
 * @param webSocketClass - The runtime's WebSocket class, or undefined if it has none.
 */
export function useWebSocket(webSocketClass: WebSocketClassInterface | undefined): void {
	WSClass = webSocketClass;
}
