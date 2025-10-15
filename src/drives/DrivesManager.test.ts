import { createClient } from "../client/createClient";
import { DrivesManager } from "./DrivesManager";
import { DriveRequest, DataSource } from "../types/drives";

describe("DrivesManager", () => {
  let drivesManager: DrivesManager;
  const createdDrives: string[] = []; // Track drives for cleanup

  beforeAll(() => {
    const apiKey = process.env.SIGNALOID_USER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SIGNALOID_USER_API_KEY environment variable");
    }

    const sdk = createClient({ method: "apiKey", key: apiKey });
    drivesManager = sdk.drives;
  });

  afterAll(async () => {
    // Clean up any drives created during tests
    for (const driveId of createdDrives) {
      try {
        await drivesManager.delete(driveId);
      } catch (error) {
        console.warn(`Failed to cleanup drive ${driveId}:`, error);
      }
    }
    createdDrives.length = 0; // Clear the array
  });

  it("creates a drive", async () => {
    const dataSources: DataSource[] = [
      {
        Object: "DataSource",
        ResourceID: "test-bucket",
        ResourceType: "Bucket",
        Location: "eu-west-2",
      },
      {
        Object: "DataSource",
        ResourceID: "test-gateway",
        ResourceType: "Gateway",
        Location: "eu-west-2",
      },
    ];

    const payload: DriveRequest = {
      Name: "Test Drive",
      DataSources: dataSources,
    };

    const drive = await drivesManager.create(payload);
    createdDrives.push(drive.DriveID); // Track for cleanup

    expect(drive.DriveID).toBeDefined();
    expect(drive.Name).toBe("Test Drive");
    expect(drive.DataSources).toEqual(dataSources);
    expect(drive.Object).toBe("Drive");
    expect(drive.Owner).toBeDefined();
    expect(drive.CreatedAt).toBeDefined();
    expect(drive.UpdatedAt).toBeDefined();
  });

  it("lists drives", async () => {
    const response = await drivesManager.list();

    expect(response.drive_ids).toBeInstanceOf(Array);
    expect(typeof response.drive_count).toBe("number");
    expect(response.user_id).toBeDefined();
  });

  it("gets drive details", async () => {
    const drives = await drivesManager.list();
    if (drives.drive_ids.length === 0) {
      console.warn("No drives available for testing");
      return;
    }

    const driveId = drives.drive_ids[0];
    const drive = await drivesManager.getOne(driveId);

    expect(drive.DriveID).toBe(driveId);
    expect(drive.Name).toBeDefined();
    expect(drive.DataSources).toBeInstanceOf(Array);
    expect(drive.Object).toBe("Drive");
    expect(drive.Owner).toBeDefined();
  });

  it("handles non-existent drive", async () => {
    await expect(drivesManager.getOne("invalid-drive-id")).rejects.toThrow();
  });
});
