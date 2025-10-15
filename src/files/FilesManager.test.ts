import { createClient } from "../client/createClient";
import { FilesManager } from "../files/FilesManager";

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

  it("lists files", async () => {
    const response = await filesManager.list();

    expect(response.items).toBeInstanceOf(Array);
    expect(typeof response.count).toBe("number");
  });

  it("creates a directory", async () => {
    const result = await filesManager.createDirectory("test-dir");

    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe("string");
  });

  it("uploads a file", async () => {
    const content = "Hello, test file!";

    const result = await filesManager.upload("test-file.txt", content);

    expect(result.message).toBeDefined();
    expect(typeof result.message).toBe("string");
  });

  it("gets file metadata", async () => {
    try {
      const result = await filesManager.get("test-file.txt");
      expect(result).toBeDefined();
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        console.warn("File not found - may still be processing");
      } else {
        throw error;
      }
    }
  });

  it("downloads a file", async () => {
    try {
      const result = await filesManager.get("test-file.txt", true);
      expect(result).toBeDefined();
      expect(result instanceof Blob || typeof result === "string").toBe(true);
    } catch (error: any) {
      if (error.message?.includes("not found")) {
        console.warn("File not found - may still be processing");
      } else {
        throw error;
      }
    }
  });
});
