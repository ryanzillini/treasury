import { describe, expect, it } from "vitest";
import { FIXTURES } from "../lib/fixtures";
import { matchLabel } from "../lib/match";

describe("gold fixtures", () => {
  it("includes the eight planned cases", () => {
    expect(FIXTURES.map((fixture) => fixture.id)).toEqual([
      "spirits_clean",
      "brand_casing",
      "abv_mismatch",
      "warning_title_case",
      "warning_missing",
      "wine_clean",
      "beer_abv_optional",
      "unreadable",
    ]);
  });

  it.each(FIXTURES)("$id matches the recorded extraction", (fixture) => {
    const result = matchLabel(fixture.application, fixture.extraction, {
      elapsedMs: 0,
      provider: "fixture",
      model: "recorded",
    });

    expect(result.status).toBe(fixture.expected.overall);
    expect(result.warning.status).toBe(fixture.expected.warning);

    for (const [field, status] of Object.entries(fixture.expected.fields)) {
      expect(
        result.fields.find((item) => item.field === field)?.status,
        field,
      ).toBe(status);
    }
  });
});
