import { getEnvironment, setEnvironment } from "./environment";

describe("environment resolution", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    // reset internal cache
    setEnvironment({}); // re-seed using detect + overrides
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test("uses production when SIGNALOID_ENV=production", () => {
    process.env.SIGNALOID_ENV = "production";
    setEnvironment({}); // rebuild current with detect
    const env = getEnvironment();
    expect(env).toBeTruthy();
    // assert any prod-specific difference if you have one
    expect(env.region).toBe("eu-west-2");
  });

  test("applies programmatic overrides", () => {
    setEnvironment("production", { api: "https://proxy" });
    const env = getEnvironment();
    expect(env.api).toBe("https://proxy");
  });
});
