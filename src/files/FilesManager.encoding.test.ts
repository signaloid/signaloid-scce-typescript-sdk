import { encodeStoragePath } from "./FilesManager";

describe("encodeStoragePath", () => {
	test("leaves an ordinary path alone", () => {
		expect(encodeStoragePath("probe/inner/notes.txt")).toBe("probe/inner/notes.txt");
	});

	test("keeps the separators intact", () => {
		expect(encodeStoragePath("a/b/c")).toBe("a/b/c");
	});

	// The point of the helper. Without it the API decodes this back into "..".
	test("escapes a pre-encoded traversal so it cannot be smuggled through", () => {
		expect(encodeStoragePath("probe/%2e%2e/marker.txt")).toBe("probe/%252e%252e/marker.txt");
	});

	test("escapes a pre-encoded separator", () => {
		expect(encodeStoragePath("probe%2Fmarker.txt")).toBe("probe%252Fmarker.txt");
	});

	test("encodes spaces and other reserved characters", () => {
		expect(encodeStoragePath("my folder/a+b.txt")).toBe("my%20folder/a%2Bb.txt");
	});

	// A literal ".." stays literal, and the API rejects it. Encoding is not the guard.
	test("passes a literal traversal through for the API to refuse", () => {
		expect(encodeStoragePath("../etc")).toBe("../etc");
	});

	test("preserves a leading slash", () => {
		expect(encodeStoragePath("/etc/note.txt")).toBe("/etc/note.txt");
	});
});
