import { describe, expect, it } from "vitest";
import {
  STATUTORY_WARNING,
  checkGovernmentWarning,
} from "../lib/warning";

const TITLE_CASE = STATUTORY_WARNING.replace(
  "GOVERNMENT WARNING",
  "Government Warning",
);

describe("checkGovernmentWarning", () => {
  it("matches the statutory statement with an all-caps prefix", () => {
    const result = checkGovernmentWarning(STATUTORY_WARNING, true);
    expect(result.status).toBe("match");
  });

  it("matches when extra whitespace is the only difference", () => {
    const spaced = STATUTORY_WARNING.replace(/\s+/g, "  ");
    expect(checkGovernmentWarning(spaced).status).toBe("match");
  });

  it("fails when the warning is missing", () => {
    const result = checkGovernmentWarning(null);
    expect(result.status).toBe("fail");
    expect(result.reason).toContain("not found on this image");
  });

  it("fails title case Government Warning", () => {
    const result = checkGovernmentWarning(TITLE_CASE, false);
    expect(result.status).toBe("fail");
    expect(result.reason).toContain("all capital letters");
  });

  it("fails when the model reports the prefix is not all caps", () => {
    const result = checkGovernmentWarning(STATUTORY_WARNING, false);
    expect(result.status).toBe("fail");
  });

  it("fails a paraphrased warning", () => {
    const result = checkGovernmentWarning(
      "GOVERNMENT WARNING: Drinking during pregnancy may cause birth defects. Drinking and driving is dangerous.",
    );
    expect(result.status).toBe("fail");
    expect(result.reason).toContain("word for word");
  });
});
