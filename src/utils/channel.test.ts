import { idToChannelName } from "./channel";

describe("idToChannelName", () => {
  it("returns the hex segment of a standard resource ID", () => {
    expect(idToChannelName("task_abc123")).toBe("abc123");
    expect(idToChannelName("bld_d4f08e92")).toBe("d4f08e92");
    expect(idToChannelName("rep_08d6c4fb75334df1827734a4f4bfda8f")).toBe(
      "08d6c4fb75334df1827734a4f4bfda8f",
    );
  });

  it("returns the input unchanged when there is no underscore", () => {
    expect(idToChannelName("abc")).toBe("abc");
  });

  it("returns the input unchanged when input is empty", () => {
    expect(idToChannelName("")).toBe("");
  });

  it("returns only the second segment for multi-underscore IDs", () => {
    // Signaloid IDs are not expected to contain multiple underscores,
    // but this documents the current behavior.
    expect(idToChannelName("task_abc_def")).toBe("abc");
  });
});
