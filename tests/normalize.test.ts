import { describe, expect, it } from "vitest";
import {
  alcoholValuesMatch,
  inferProductType,
  nameSimilarity,
  normalizeName,
  normalizeOrigin,
  parseAlcohol,
  parseVolume,
  volumesMatch,
} from "../lib/normalize";

describe("normalizeName", () => {
  it("treats casing and punctuation as the same name", () => {
    expect(normalizeName("STONE'S THROW")).toBe(normalizeName("Stone's Throw"));
    expect(normalizeName("Old Tom Distillery")).toBe(
      normalizeName("OLD TOM DISTILLERY"),
    );
  });

  it("straightens curly quotes", () => {
    expect(normalizeName("Stone’s Throw")).toBe(normalizeName("Stone's Throw"));
  });
});

describe("normalizeOrigin", () => {
  it("strips Product of the from a country line", () => {
    expect(normalizeOrigin("Product of the United States")).toBe(
      normalizeOrigin("United States"),
    );
  });
});

describe("inferProductType", () => {
  it("reads bourbon as spirits and pale ale as beer", () => {
    expect(inferProductType("Kentucky Straight Bourbon Whiskey")).toBe(
      "distilled_spirits",
    );
    expect(inferProductType("Pale Ale")).toBe("malt_beverage");
    expect(inferProductType("Cabernet Sauvignon")).toBe("wine");
  });

  it("treats barley wine and wheat wine as beer, not wine", () => {
    expect(inferProductType("Barley Wine")).toBe("malt_beverage");
    expect(inferProductType("Wheat Wine")).toBe("malt_beverage");
    expect(inferProductType("American Barley Wine")).toBe("malt_beverage");
  });

  it("treats scotch ale and bourbon county stout as beer", () => {
    expect(inferProductType("Scotch Ale")).toBe("malt_beverage");
    expect(inferProductType("Bourbon County Stout")).toBe("malt_beverage");
  });

  it("still reads scotch whisky and table wine correctly", () => {
    expect(inferProductType("Scotch Whisky")).toBe("distilled_spirits");
    expect(inferProductType("Table Wine")).toBe("wine");
  });
});

describe("nameSimilarity", () => {
  it("scores exact normalized names as 1", () => {
    expect(nameSimilarity("STONE'S THROW", "Stone's Throw")).toBe(1);
  });
});

describe("parseAlcohol", () => {
  it("reads percent and proof", () => {
    expect(parseAlcohol("45% Alc./Vol. (90 Proof)")).toEqual({
      abv: 45,
      proof: 90,
    });
  });

  it("derives ABV from proof when percent is missing", () => {
    expect(parseAlcohol("90 proof")).toEqual({ abv: 45, proof: 90 });
  });
});

describe("alcoholValuesMatch", () => {
  it("matches equivalent ABV strings", () => {
    expect(
      alcoholValuesMatch(
        parseAlcohol("45%"),
        parseAlcohol("45% Alc./Vol. (90 Proof)"),
      ),
    ).toBe(true);
  });

  it("rejects a different percent", () => {
    expect(
      alcoholValuesMatch(parseAlcohol("45%"), parseAlcohol("40% Alc./Vol.")),
    ).toBe(false);
  });
});

describe("parseVolume", () => {
  it("converts common units to milliliters", () => {
    expect(parseVolume("750 mL").milliliters).toBe(750);
    expect(parseVolume("75 cl").milliliters).toBe(750);
    expect(parseVolume("0.75 L").milliliters).toBe(750);
  });
});

describe("volumesMatch", () => {
  it("treats 750 mL, 75 cl, and 0.75 L as the same", () => {
    expect(volumesMatch("750 mL", "75 cl")).toBe(true);
    expect(volumesMatch("750 mL", "0.75 L")).toBe(true);
    expect(volumesMatch("750 mL", "1.5 L")).toBe(false);
  });
});
