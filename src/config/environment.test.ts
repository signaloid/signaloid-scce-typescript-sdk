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

  test("defaults to production when no env is set", () => {
    delete process.env.NODE_ENV;
    setEnvironment({}); // rebuild current with detect
    const env = getEnvironment();
    expect(env).toBeTruthy();
    expect(env.userPoolId).toBe("eu-west-2_S05v0KKxN");
  });

  test("uses production by default", () => {
    setEnvironment({}); // rebuild current with default
    const env = getEnvironment();
    expect(env).toBeTruthy();
    expect(env.region).toBe("eu-west-2");
  });

  test("applies overrides from process.env", () => {
    process.env.API_ENDPOINT = "https://override.example.com";
    setEnvironment("production");
    const env = getEnvironment();
    expect(env.api).toBe("https://override.example.com");
  });

  test("applies programmatic overrides", () => {
    setEnvironment("production", { api: "https://proxy" });
    const env = getEnvironment();
    expect(env.api).toBe("https://proxy");
  });
});
