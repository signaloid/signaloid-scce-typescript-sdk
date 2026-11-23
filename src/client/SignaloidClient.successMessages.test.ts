import http from "http";
import { AddressInfo } from "net";
import { createClient } from "./createClient";
import { SignaloidClient } from "./SignaloidClient";

describe("success messages returned as the API sends them", () => {
	let server: http.Server;
	let client: SignaloidClient;
	let jwtClient: SignaloidClient;
	const body = { message: "Done successfully." };

	beforeAll(async () => {
		server = http.createServer((_req, res) => {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(body));
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		const { port } = server.address() as AddressInfo;
		client = createClient(
			{ method: "apiKey", key: "test-key" },
			{ overrideEndpoints: { api: `http://127.0.0.1:${port}` } },
		);
		jwtClient = createClient(
			{ method: "jwt", token: "test-token" },
			{ overrideEndpoints: { api: `http://127.0.0.1:${port}` } },
		);
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
	});

	it.each([
		["repositories.disconnect", (c: SignaloidClient) => c.repositories.disconnect("rep_1")],
		["repositories.delete", (c: SignaloidClient) => c.repositories.delete("rep_1")],
		["tasks.deleteOne", (c: SignaloidClient) => c.tasks.deleteOne("tsk_1")],
		["tasks.cancel", (c: SignaloidClient) => c.tasks.cancel("tsk_1")],
		["builds.deleteOne", (c: SignaloidClient) => c.builds.deleteOne("bld_1")],
		["builds.cancel", (c: SignaloidClient) => c.builds.cancel("bld_1")],
		["webhooks.delete", (c: SignaloidClient) => c.webhooks.delete("whk_1")],
		["github.deleteIntegration", (c: SignaloidClient) => c.github.deleteIntegration("usr_1")],
	])("%s returns the API's message as sent", async (_name, call) => {
		await expect(call(client)).resolves.toEqual(body);
	});

	it.each([
		["builds.createFromSourceCode", (c: SignaloidClient) => c.builds.createFromSourceCode({} as any)],
		["webhooks.create", (c: SignaloidClient) => c.webhooks.create({} as any)],
		["webhooks.update", (c: SignaloidClient) => c.webhooks.update("whk_1", { URL: "https://example.com" })],
		["webhooks.enable", (c: SignaloidClient) => c.webhooks.enable("whk_1")],
		["subscriptions.update", (c: SignaloidClient) => c.subscriptions.update({ Tier: "ProTier" })],
	])("%s types the API's message on the response", async (_name, call) => {
		const message: string = (await call(jwtClient)).message;

		expect(message).toBe(body.message);
	});
});
