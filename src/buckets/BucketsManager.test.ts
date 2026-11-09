import { createClient } from "../client/createClient";
import { BucketsManager } from "./BucketsManager";
import { BucketRequest } from "../types/buckets";

describe("BucketsManager", () => {
	let bucketsManager: BucketsManager;
	const createdBuckets: string[] = []; // Track buckets for cleanup

	beforeAll(() => {
		const apiKey = process.env.SIGNALOID_USER_API_KEY;
		if (!apiKey) {
			throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
		}

		const sdk = createClient({ method: "apiKey", key: apiKey });
		bucketsManager = sdk.buckets;
	});

	afterEach(async () => {
		// Clean up any buckets created during tests
		for (const bucketId of createdBuckets) {
			try {
				await bucketsManager.delete(bucketId);
			} catch (error) {
				console.warn(`Failed to cleanup bucket ${bucketId}:`, error);
			}
		}
		createdBuckets.length = 0; // Clear the array
	});

	describe("create", () => {
		it("creates a bucket successfully", async () => {
			const payload: BucketRequest = {
				Name: "Test Bucket",
				Account: "test-account",
				Read: true,
				Write: false,
			};

			const bucket = await bucketsManager.create(payload);
			createdBuckets.push(bucket.BucketID); // Track for cleanup

			expect(bucket.BucketID).toBeDefined();
			expect(bucket.Name).toBe("Test Bucket");
			expect(bucket.Account).toBe("test-account");
			expect(bucket).not.toHaveProperty("MountPath");
			expect(bucket.Read).toBe(true);
			expect(bucket.Write).toBe(false);
			expect(bucket.Object).toBe("Bucket");
		});
	});

	describe("list", () => {
		it("returns buckets list", async () => {
			const response = await bucketsManager.list();

			expect(response.BucketIDs).toBeInstanceOf(Array);
			expect(response.Count).toBe(response.BucketIDs.length);
			expect(response.UserID).toBeDefined();
		});

		it("includes created bucket in list", async () => {
			// Create a bucket first
			const bucket = await bucketsManager.create({
				Name: "List Test Bucket",
				Account: "list-test-account",
				Read: true,
				Write: false,
			});
			createdBuckets.push(bucket.BucketID);

			const response = await bucketsManager.list();

			expect(response.BucketIDs).toContain(bucket.BucketID);
		});
	});

	describe("getOne", () => {
		it("retrieves a bucket by ID", async () => {
			// Create a bucket first
			const createdBucket = await bucketsManager.create({
				Name: "GetOne Test Bucket",
				Account: "getone-test-account",
				Read: false,
				Write: true,
			});
			createdBuckets.push(createdBucket.BucketID);

			const bucket = await bucketsManager.getOne(createdBucket.BucketID);

			expect(bucket.BucketID).toBe(createdBucket.BucketID);
			expect(bucket.Name).toBe("GetOne Test Bucket");
			expect(bucket.Object).toBe("Bucket");
		});

		it("throws error for non-existent bucket", async () => {
			await expect(bucketsManager.getOne("invalid-bucket-id")).rejects.toThrow();
		});
	});

	describe("update", () => {
		it("updates a bucket", async () => {
			// Create a bucket first
			const bucket = await bucketsManager.create({
				Name: "Original Name",
				Account: "original-account",
				Read: true,
				Write: false,
			});
			createdBuckets.push(bucket.BucketID);

			// Update it
			const updatePayload = {
				Name: "Updated Name",
				Read: false,
				Write: true,
			};

			const result = await bucketsManager.update(bucket.BucketID, updatePayload);
			expect(result.message).toBe("OK");

			// Verify the update
			const updatedBucket = await bucketsManager.getOne(bucket.BucketID);
			expect(updatedBucket.Name).toBe("Updated Name");
			expect(updatedBucket.Read).toBe(false);
			expect(updatedBucket.Write).toBe(true);
		});
	});

	describe("delete", () => {
		it("deletes a bucket", async () => {
			// Create bucket to delete
			const bucket = await bucketsManager.create({
				Name: "Bucket to Delete",
				Account: "delete-test-account",
				Read: true,
				Write: false,
			});

			// Delete it
			const result = await bucketsManager.delete(bucket.BucketID);

			expect(result.message).toBe("OK");

			// Verify it is gone
			await expect(bucketsManager.getOne(bucket.BucketID)).rejects.toThrow();
		});

		it("throws error for non-existent bucket", async () => {
			await expect(bucketsManager.delete("invalid-bucket-id")).rejects.toThrow();
		});
	});
});
