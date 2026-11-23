import WebSocket from "ws";
import { setupRuntime } from "./node";
import * as ws from "./ws";

it("gives the realtime client the ws package's WebSocket", () => {
	ws.useWebSocket(undefined);

	setupRuntime();

	expect(ws.WSClass).toBe(WebSocket);
});
