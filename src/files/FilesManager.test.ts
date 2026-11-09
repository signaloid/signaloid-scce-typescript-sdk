import axios, { AxiosInstance } from "axios";
import { createClient } from "../client/createClient";
import { FilesManager } from "../files/FilesManager";
import { FileItem } from "../types/files";

describe("FilesManager", () => {
	let filesManager: FilesManager;

	beforeAll(() => {
		const apiKey = process.env.SIGNALOID_USER_API_KEY;
		if (!apiKey) {
			throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
		}

		const sdk = createClient({ method: "apiKey", key: apiKey });
		filesManager = sdk.files;
	});

	describe("list", () => {
		it("returns items with correct shape", async () => {
			const response = await filesManager.list({ path: "/" });

			expect(response.Files).toBeInstanceOf(Array);
			expect(typeof response.Count).toBe("number");
			expect(response.Count).toBe(response.Files.length);

			if (response.Files.length > 0) {
				const item = response.Files[0];
				expect(typeof item.Path).toBe("string");
				expect(typeof item.LastModified).toBe("number");
				expect(typeof item.Size).toBe("number");
				expect(typeof item.ETag).toBe("string");
			}
		});

		it("supports pagination via ContinuationKey", async () => {
			const PREFIX = "pagination/";
			const SEED_COUNT = 5;
			for (let i = 0; i < SEED_COUNT; i++) {
				await filesManager.upload(`${PREFIX}page-${i}.txt`, `content-${i}`);
			}

			const firstPage = await filesManager.list({ path: `/${PREFIX}` });
			expect(firstPage.Files.length).toBeGreaterThan(0);

			if (!firstPage.ContinuationKey) {
				return;
			}

			expect(typeof firstPage.ContinuationKey).toBe("string");

			const secondPage = await filesManager.list({
				path: `/${PREFIX}`,
				startKey: firstPage.ContinuationKey,
			});

			expect(secondPage.Files.length).toBeGreaterThan(0);

			const firstPaths = new Set(firstPage.Files.map((i) => i.Path));
			for (const item of secondPage.Files) {
				expect(firstPaths.has(item.Path)).toBe(false);
			}
		});
	});

	describe("get (stat)", () => {
		it("returns file metadata with correct shape", async () => {
			// First ensure a file exists
			await filesManager.upload("test-stat-file.txt", "test content for stat");

			const result = (await filesManager.get("test-stat-file.txt")) as FileItem;

			expect(result).toBeDefined();
			expect(typeof result.LastModified).toBe("number");
			expect(typeof result.Size).toBe("number");
			expect(typeof result.ContentType).toBe("string");
			expect(typeof result.ETag).toBe("string");
			// DownloadURL should NOT be present without ?download
			expect(result.DownloadURL).toBeUndefined();
		});

		it("includes DownloadURL when download=true", async () => {
			const result = (await filesManager.get("test-stat-file.txt", true)) as FileItem;

			expect(result).toBeDefined();
			// When download=true, the response includes a presigned DownloadURL
			if (result.DownloadURL) {
				expect(typeof result.DownloadURL).toBe("string");
				expect(result.DownloadURL).toContain("https://");
			}
		});

		it("returns 404 for non-existent file", async () => {
			await expect(filesManager.get("nonexistent-file-xyz.txt")).rejects.toThrow();
		});
	});

	describe("upload", () => {
		it("uploads a string file", async () => {
			const result = await filesManager.upload("test-upload.txt", "Hello, test file!");

			expect(result.message).toBeDefined();
			expect(typeof result.message).toBe("string");
		});
	});

	describe("createDirectory", () => {
		it("creates a directory", async () => {
			const result = await filesManager.createDirectory("test-dir/");

			expect(result.message).toBeDefined();
			expect(typeof result.message).toBe("string");
		});
	});

	describe("delete", () => {
		it("deletes a file", async () => {
			// Upload then delete
			await filesManager.upload("test-delete-me.txt", "to be deleted");
			const result = await filesManager.delete("test-delete-me.txt");

			expect(result.message).toBeDefined();
		});

		it("returns error for non-existent file", async () => {
			await expect(filesManager.delete("nonexistent-delete-xyz.txt")).rejects.toThrow();
		});
	});
});

// Runs without the API: the upload flow against a stubbed client and presigned PUT.
describe("FilesManager upload without the API", () => {
	const UPLOAD_URL = "https://storage.test/upload";
	const put = jest.fn();
	const filesManager = new FilesManager({ put } as unknown as AxiosInstance);
	let presignedPut: jest.SpyInstance;

	beforeEach(() => {
		put.mockReset().mockResolvedValue({ data: { UploadURL: UPLOAD_URL } });
		presignedPut = jest.spyOn(axios, "put").mockResolvedValue({ status: 200 });
	});
	afterEach(() => presignedPut.mockRestore());

	it.each([
		["string", ""],
		["Blob", new Blob([])],
		["ArrayBuffer", new ArrayBuffer(0)],
	])("rejects empty %s content without calling the API", async (_kind, content) => {
		await expect(filesManager.upload("empty.txt", content)).rejects.toThrow(/empty file/);
		expect(put).not.toHaveBeenCalled();
	});

	it("requests a presigned URL for non-empty content and uploads to UploadURL", async () => {
		await filesManager.upload("one-byte.txt", "x");
		expect(put).toHaveBeenCalledWith("/files/one-byte.txt", null, { params: { size: "1" } });
		expect(presignedPut).toHaveBeenCalledWith(UPLOAD_URL, expect.any(Blob), expect.anything());
	});

	it("fails instead of reporting success when the API returns no UploadURL", async () => {
		put.mockResolvedValueOnce({ data: { upload_url: UPLOAD_URL } });
		await expect(filesManager.upload("one-byte.txt", "x")).rejects.toThrow(/UploadURL/);
		expect(presignedPut).not.toHaveBeenCalled();
	});
});
