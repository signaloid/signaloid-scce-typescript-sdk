import http from "http";
import { AddressInfo } from "net";
import { createClient } from "../client/createClient";
import { SignaloidClient } from "../client/SignaloidClient";
import { ERROR_CODES } from "../errors/codes";

describe("FilesManager.upload to a presigned URL", () => {
	let server: http.Server;
	let client: SignaloidClient;

	beforeAll(async () => {
		server = http.createServer((req, res) => {
			if (req.url?.startsWith("/files/")) {
				const { port } = server.address() as AddressInfo;
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ UploadURL: `http://127.0.0.1:${port}/s3` }));
				return;
			}
			res.writeHead(403, { "Content-Type": "application/xml" });
			res.end("<Error><Code>AccessDenied</Code></Error>");
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

	it("raises FILE_UPLOAD_FAILED without S3's status or axios's message on the error", async () => {
		const error = await client.files.upload("a.txt", "x").catch((e) => e);

		expect(error).toMatchObject({
			name: "SdkError",
			code: ERROR_CODES.FILE_UPLOAD_FAILED,
			status: undefined,
			message: "We could not upload the file. Please try again. If this issue persists, please contact Signaloid Support at developer-support@signaloid.com.",
			details: { status: 403, data: "<Error><Code>AccessDenied</Code></Error>" },
		});
		expect(error.details).not.toHaveProperty("message");
	});
});
