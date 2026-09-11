import { describe, expect, it } from "vitest";
import { hasConflictingDuplicateValues } from "../../scripts/canonical-head";

describe("hasConflictingDuplicateValues", () => {
  it("does not flag duplicate values that normalize to the same URL", () => {
    expect(
      hasConflictingDuplicateValues([
        "https://sade-il.com/requests-activity",
        "https://sade-il.com/requests-activity/",
      ]),
    ).toBe(false);
  });

  it("flags duplicates when normalized values conflict", () => {
    expect(
      hasConflictingDuplicateValues([
        "https://sade-il.com/requests-activity",
        "https://sade-il.com/projects",
      ]),
    ).toBe(true);
  });
});
