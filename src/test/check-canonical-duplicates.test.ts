import { describe, expect, it } from "vitest";
import { hasConflictingDuplicateValues } from "../../scripts/canonical-head";

describe("hasConflictingDuplicateValues", () => {
  it("does not flag duplicate values that normalize to the same URL", () => {
    expect(
      hasConflictingDuplicateValues({
        tagCount: 2,
        values: [
          "https://sade-il.com/requests-activity",
          "https://sade-il.com/requests-activity/",
        ],
      }),
    ).toBe(false);
  });

  it("flags duplicates when normalized values conflict", () => {
    expect(
      hasConflictingDuplicateValues({
        tagCount: 2,
        values: [
          "https://sade-il.com/requests-activity",
          "https://sade-il.com/projects",
        ],
      }),
    ).toBe(true);
  });

  it("does not report a conflict when there is no duplicate tag", () => {
    expect(
      hasConflictingDuplicateValues({
        tagCount: 1,
        values: [
          "https://sade-il.com/requests-activity",
          "https://sade-il.com/projects",
        ],
      }),
    ).toBe(false);
  });

  it("treats unparsable duplicate values consistently", () => {
    expect(
      hasConflictingDuplicateValues({
        tagCount: 2,
        values: ["%%%bad-url-1", "%%%bad-url-2"],
      }),
    ).toBe(false);
  });
});
