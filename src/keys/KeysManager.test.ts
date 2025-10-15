import { createClient } from "../client/createClient";
import { KeysManager } from "./KeysManager";
import { KeyRequest } from "../types/keys";

describe("KeysManager", () => {
  let keysManager: KeysManager;
  const createdKeys: string[] = []; // Track keys for cleanup

  beforeAll(() => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }

    const sdk = createClient({ method: "apiKey", key: apiKey });
    keysManager = sdk.keys;
  });

  afterAll(async () => {
    // Clean up any keys created during tests
    for (const keyId of createdKeys) {
      try {
        await keysManager.delete(keyId);
      } catch (error) {
        console.warn(`Failed to cleanup key ${keyId}:`, error);
      }
    }
    createdKeys.length = 0; // Clear the array
  });

  describe("create", () => {
    it("creates a key successfully", async () => {
      const payload: KeyRequest = {
        Name: "Test Key",
        ValidUntil: null,
      };

      const key = await keysManager.create(payload);
      createdKeys.push(key.KeyID); // Track for cleanup

      expect(key.KeyID).toBeDefined();
      expect(key.Key).toMatch(/^scce_[a-f0-9_]+$/);
      expect(key.Name).toBe("Test Key");
      expect(key.Object).toBe("Key");
    });

    it("creates a key with expiration", async () => {
      const validUntil = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload: KeyRequest = {
        Name: "Expiring Key",
        ValidUntil: validUntil,
      };

      const key = await keysManager.create(payload);
      createdKeys.push(key.KeyID);

      expect(key.ValidUntil).toBe(validUntil);
    });
  });

  describe("list", () => {
    it("returns keys list", async () => {
      const response = await keysManager.list();

      expect(response.Keys).toBeInstanceOf(Array);
      expect(typeof response.Count).toBe("number");
      expect(response.UserID).toBeDefined();
    });
  });

  describe("delete", () => {
    it("deletes a key", async () => {
      // Create key to delete
      const key = await keysManager.create({
        Name: "Key to Delete",
        ValidUntil: null,
      });

      // Delete it
      const result = await keysManager.delete(key.KeyID);

      expect(result.message).toBe("OK");

      // Verify it's gone
      const keys = await keysManager.list();
      const deletedKey = keys.Keys?.find((k) => k.KeyID === key.KeyID);
      expect(deletedKey).toBeUndefined();
    });

    it("throws error for non-existent key", async () => {
      await expect(keysManager.delete("invalid-key-id")).rejects.toThrow();
    });
  });
});
