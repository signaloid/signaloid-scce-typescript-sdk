import { execFileSync } from "child_process";

// The package imports itself by name, which differs between the private and public repositories.
const SDK = JSON.stringify(require("../../package.json").name);

function typeOfCreateClient(nodeArgs: string[], script: string): string {
	return execFileSync(process.execPath, [...nodeArgs, "-e", `${script}; console.log(typeof sdk.createClient);`], {
		encoding: "utf8",
		timeout: 20000,
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

it("loads the ESM build in Node, which has no require", () => {
	expect(typeOfCreateClient(["--input-type=module"], `const sdk = await import(${SDK})`)).toBe("function");
});

it("loads the CommonJS build in Node", () => {
	expect(typeOfCreateClient([], `const sdk = require(${SDK})`)).toBe("function");
});

it("loads the browser build where there is no global WebSocket", () => {
	const script = `delete globalThis.WebSocket; const sdk = await import(${SDK})`;

	expect(typeOfCreateClient(["--input-type=module", "--conditions=browser"], script)).toBe("function");
});
