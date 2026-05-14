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

      expect(response.items).toBeInstanceOf(Array);
      expect(typeof response.count).toBe("number");
      expect(response.count).toBe(response.items.length);

      if (response.items.length > 0) {
        const item = response.items[0];
        expect(typeof item.path).toBe("string");
        expect(typeof item.last_modified).toBe("number");
        expect(typeof item.size).toBe("number");
        expect(typeof item.etag).toBe("string");
      }
    });

    it("supports pagination via nextContinuationToken", async () => {
      const response = await filesManager.list({ path: "/" });
      // nextContinuationToken may or may not be present
      if (response.nextContinuationToken) {
        expect(typeof response.nextContinuationToken).toBe("string");
      }
    });
  });

  describe("get (stat)", () => {
    it("returns file metadata with correct shape", async () => {
      // First ensure a file exists
      await filesManager.upload("test-stat-file.txt", "test content for stat");

      const result = (await filesManager.get("test-stat-file.txt")) as FileItem;

      expect(result).toBeDefined();
      expect(typeof result.last_modified).toBe("number");
      expect(typeof result.size).toBe("number");
      expect(typeof result.content_type).toBe("string");
      expect(typeof result.etag).toBe("string");
      // download_url should NOT be present without ?download
      expect(result.download_url).toBeUndefined();
    });

    it("includes download_url when download=true", async () => {
      const result = (await filesManager.get(
        "test-stat-file.txt",
        true,
      )) as FileItem;

      expect(result).toBeDefined();
      // When download=true, the response includes a presigned download_url
      if (result.download_url) {
        expect(typeof result.download_url).toBe("string");
        expect(result.download_url).toContain("https://");
      }
    });

    it("returns 404 for non-existent file", async () => {
      await expect(
        filesManager.get("nonexistent-file-xyz.txt"),
      ).rejects.toThrow();
    });
  });

  describe("upload", () => {
    it("uploads a string file", async () => {
      const result = await filesManager.upload(
        "test-upload.txt",
        "Hello, test file!",
      );

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
      await expect(
        filesManager.delete("nonexistent-delete-xyz.txt"),
      ).rejects.toThrow();
    });
  });
});
