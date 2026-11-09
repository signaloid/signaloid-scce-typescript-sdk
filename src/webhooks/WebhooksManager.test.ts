import { createClient } from "../client/createClient";
import { WebhooksManager } from "../webhooks/WebhooksManager";
import { CreateWebhookRequest } from "../types/webhooks";

describe("WebhooksManager", () => {
	let webhooksManager: WebhooksManager;
	const createdWebhooks: string[] = []; // Track webhooks for cleanup

	beforeAll(() => {
		const apiKey = process.env.SIGNALOID_USER_API_KEY;
		if (!apiKey) {
			throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
		}

		const sdk = createClient({ method: "apiKey", key: apiKey });
		webhooksManager = sdk.webhooks;
	});

	afterAll(async () => {
		// Clean up any webhooks created during tests
		for (const webhookId of createdWebhooks) {
			try {
				await webhooksManager.delete(webhookId);
			} catch (error) {
				console.warn(`Failed to cleanup webhook ${webhookId}:`, error);
			}
		}
		createdWebhooks.length = 0; // Clear the array
	});

	it("creates a webhook", async () => {
		const request: CreateWebhookRequest = {
			URL: "https://webhook.site/test-webhook",
			Events: ["build-status", "task-status"],
			Description: "Test webhook",
		};

		const result = await webhooksManager.create(request);
		createdWebhooks.push(result.WebhookID); // Track for cleanup

		expect(result.WebhookID).toBeDefined();
		expect(result.Secret).toMatch(/^whsec_/);
		expect(result.URL).toBe(request.URL);
		expect(result.Events).toEqual(request.Events);
		expect(result.Status).toBe("active");
		expect(result.CreatedAt).toBeDefined();
	});

	it("lists webhooks", async () => {
		const response = await webhooksManager.list();

		expect(response.Webhooks).toBeInstanceOf(Array);
		expect(typeof response.Count).toBe("number");
		expect(response.Count).toBe(response.Webhooks.length);
	});

	it("gets webhook details", async () => {
		// Create a webhook first
		const webhook = await webhooksManager.create({
			URL: "https://webhook.site/test-details",
			Events: ["task-status"],
		});
		createdWebhooks.push(webhook.WebhookID);

		const details = await webhooksManager.getOne(webhook.WebhookID);

		expect(details.WebhookID).toBe(webhook.WebhookID);
		expect(details.URL).toBe("https://webhook.site/test-details");
		expect(details.Events).toEqual(["task-status"]);
		expect(details.Status).toBe("active");
		expect(details.FailureCount).toBeDefined();
	});

	it("gets webhook statistics", async () => {
		const stats = await webhooksManager.getStats();

		expect(typeof stats.total).toBe("number");
		expect(typeof stats.active).toBe("number");
		expect(typeof stats.disabled).toBe("number");
		expect(typeof stats.withFailures).toBe("number");
		expect(stats.recentlyFailed).toBeInstanceOf(Array);
		expect(stats.total).toBe(stats.active + stats.disabled);
	});

	it("handles non-existent webhook", async () => {
		await expect(webhooksManager.getOne("invalid-webhook-id")).rejects.toThrow();
	});

	it("validates invalid URL", async () => {
		const invalidRequest: CreateWebhookRequest = {
			URL: "invalid-url",
			Events: ["build-status"],
		};

		await expect(webhooksManager.create(invalidRequest)).rejects.toThrow();
	});
});
