export function setupRuntime() {
  if (typeof (globalThis as any).crypto === "undefined") {
    // Only ever included in Node build
    const { webcrypto } = require("node:crypto");
    (globalThis as any).crypto = webcrypto;
  }
}
