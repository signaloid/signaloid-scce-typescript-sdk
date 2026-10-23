import http from "http";
import { AddressInfo } from "net";
import { createClient } from "./createClient";
import { SignaloidClient } from "./SignaloidClient";
import { ERROR_CODES } from "../errors/codes";

type CannedResponse = { status: number; headers?: Record<string, string>; body: unknown };

// Every request to /tiers gets the response set by the test, so the interceptor runs against
// a real HTTP exchange without reaching the Signaloid API.
describe("SignaloidClient error mapping", () => {
	let server: http.Server;
	let client: SignaloidClient;
	let canned: CannedResponse;

	beforeAll(async () => {
		server = http.createServer((_req, res) => {
			res.writeHead(canned.status, { "Content-Type": "application/json", ...canned.headers });
			res.end(JSON.stringify(canned.body));
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		const { port } = server.address() as AddressInfo;
		client = createClient(
			{ method: "apiKey", key: "test-key" },
			{ overrideEndpoints: { api: `http://127.0.0.1:${port}` } },
		);
	});

	afterAll(async () => {
		await new Promise((resolve) => server.close(resolve));
	});

	it("maps 429 and reads Retry-After", async () => {
		canned = {
			status: 429,
			headers: { "Retry-After": "30" },
			body: { error: "ConcurrencyLimitExceeded", message: "Task concurrency limit reached." },
		};

		await expect(client.tiers.list()).rejects.toMatchObject({
			code: ERROR_CODES.API_TOO_MANY_REQUESTS,
			status: 429,
			errorType: "ConcurrencyLimitExceeded",
			retryAfter: 30,
			message: "Task concurrency limit reached.",
		});
	});

	it("reads a Retry-After given as an HTTP date", async () => {
		canned = {
			status: 429,
			headers: { "Retry-After": new Date(Date.now() + 60_000).toUTCString() },
			body: { error: "ConcurrencyLimitExceeded", message: "Task concurrency limit reached." },
		};

		const error = await client.tiers.list().catch((e) => e);
		expect(error.retryAfter).toBeGreaterThan(55);
		expect(error.retryAfter).toBeLessThanOrEqual(60);
	});

	// jest.global-setup.cjs pins a non-UTC zone, so reading the date as local time would fail here.
	it("reads a Retry-After given as an asctime date, as UTC", async () => {
		const expired = "Sun Nov  6 08:49:37 1994";
		canned = {
			status: 429,
			headers: { "Retry-After": expired },
			body: { error: "Error", message: "Slow down." },
		};
		await expect(client.tiers.list()).rejects.toMatchObject({ retryAfter: 0 });

		// toUTCString() gives "Sun, 06 Nov 1994 08:49:37 GMT"; the `asctime` form of the same
		// date is "Sun Nov  6 08:49:37 1994", reordered and with the day padded by a space.
		const [weekday, day, month, year, time] = new Date(Date.now() + 60_000).toUTCString().split(" ");
		const future = `${weekday.slice(0, 3)} ${month} ${day.replace(/^0/, " ")} ${time} ${year}`;
		canned = {
			status: 429,
			headers: { "Retry-After": future },
			body: { error: "Error", message: "Slow down." },
		};
		const error = await client.tiers.list().catch((e) => e);
		expect(error.retryAfter).toBeGreaterThan(55);
		expect(error.retryAfter).toBeLessThanOrEqual(60);
	});

	it.each(["-5", "1e3", "0x1E", "1.5"])("ignores the malformed Retry-After %s", async (header) => {
		canned = {
			status: 429,
			headers: { "Retry-After": header },
			body: { error: "Error", message: "Slow down." },
		};

		await expect(client.tiers.list()).rejects.toMatchObject({ retryAfter: undefined });
	});

	it("ignores a Retry-After that is neither delta-seconds nor a date", async () => {
		canned = {
			status: 429,
			headers: { "Retry-After": "1e3" },
			body: { error: "Error", message: "Slow down." },
		};

		await expect(client.tiers.list()).rejects.toMatchObject({ retryAfter: undefined });
	});

	it("leaves retryAfter unset when the 429 carries no Retry-After", async () => {
		canned = {
			status: 429,
			body: { error: "ExecutionTimeLimitExceeded", message: "Task execution time limit reached." },
		};

		await expect(client.tiers.list()).rejects.toMatchObject({
			code: ERROR_CODES.API_TOO_MANY_REQUESTS,
			errorType: "ExecutionTimeLimitExceeded",
			retryAfter: undefined,
		});
	});

	it.each([
		[413, ERROR_CODES.API_PAYLOAD_TOO_LARGE],
		[415, ERROR_CODES.API_UNSUPPORTED_MEDIA_TYPE],
		[400, ERROR_CODES.API_BAD_REQUEST],
		[503, ERROR_CODES.API_SERVER_ERROR],
	])("maps %i to %s", async (status, code) => {
		canned = { status, body: { error: "Error", message: "Refused." } };

		await expect(client.tiers.list()).rejects.toMatchObject({ code, status, errorType: "Error" });
	});
});
