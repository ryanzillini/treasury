import { describe, expect, it } from "vitest";
import { matchLabel } from "../lib/match";
import { STATUTORY_WARNING } from "../lib/warning";
import type { ApplicationFields, ExtractedLabel } from "../lib/types";

const META = { elapsedMs: 12, provider: "test", model: "test" };

const SPIRITS_APP: ApplicationFields = {
  brandName: "Old Tom Distillery",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  bottlerNameAddress: "Old Tom Distillery, Frankfort, KY",
  productType: "distilled_spirits",
};

const SPIRITS_LABEL: ExtractedLabel = {
  brandName: "OLD TOM DISTILLERY",
  fancifulName: null,
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  bottlerNameAddress: "Old Tom Distillery, Frankfort, KY",
  countryOfOrigin: null,
  warningText: STATUTORY_WARNING,
  warningAllCapsPrefix: true,
  readable: true,
};

function fieldStatus(result: ReturnType<typeof matchLabel>, field: string) {
  return result.fields.find((item) => item.field === field)?.status;
}

describe("matchLabel", () => {
  it("fails when a spirits label is filed as beer", () => {
    const result = matchLabel(
      { ...SPIRITS_APP, productType: "malt_beverage" },
      SPIRITS_LABEL,
      META,
    );
    expect(result.status).toBe("fail");
    expect(fieldStatus(result, "productType")).toBe("fail");
  });

  it("matches a clean spirits label against the application", () => {
    const result = matchLabel(SPIRITS_APP, SPIRITS_LABEL, META);
    expect(result.status).toBe("match");
    expect(result.warning.status).toBe("match");
  });

  it("matches brand names that differ only by casing and punctuation", () => {
    const result = matchLabel(
      { ...SPIRITS_APP, brandName: "Stone's Throw" },
      { ...SPIRITS_LABEL, brandName: "STONE'S THROW" },
      META,
    );
    expect(fieldStatus(result, "brandName")).toBe("match");
    expect(result.status).toBe("match");
  });

  it("fails when alcohol content does not match", () => {
    const result = matchLabel(
      { ...SPIRITS_APP, alcoholContent: "40% Alc./Vol. (80 Proof)" },
      SPIRITS_LABEL,
      META,
    );
    expect(result.status).toBe("fail");
    expect(fieldStatus(result, "alcoholContent")).toBe("fail");
  });

  it("fails a title-case government warning", () => {
    const result = matchLabel(
      SPIRITS_APP,
      {
        ...SPIRITS_LABEL,
        warningText: STATUTORY_WARNING.replace(
          "GOVERNMENT WARNING",
          "Government Warning",
        ),
        warningAllCapsPrefix: false,
      },
      META,
    );
    expect(result.status).toBe("fail");
    expect(result.warning.status).toBe("fail");
  });

  it("fails when the warning is missing", () => {
    const result = matchLabel(
      SPIRITS_APP,
      { ...SPIRITS_LABEL, warningText: null, warningAllCapsPrefix: null },
      META,
    );
    expect(result.status).toBe("fail");
    expect(result.warning.status).toBe("fail");
  });

  it("matches Product of the United States to United States", () => {
    const application: ApplicationFields = {
      brandName: "River Bench Vineyards",
      classType: "Cabernet Sauvignon",
      alcoholContent: "13.5% Alc. by Vol.",
      netContents: "750 mL",
      countryOfOrigin: "United States",
      productType: "wine",
    };
    const extracted: ExtractedLabel = {
      brandName: "RIVER BENCH VINEYARDS",
      fancifulName: null,
      classType: "Cabernet Sauvignon",
      alcoholContent: "13.5% Alc. by Vol.",
      netContents: "75 cl",
      bottlerNameAddress: null,
      countryOfOrigin: "Product of the United States",
      warningText: STATUTORY_WARNING,
      warningAllCapsPrefix: true,
      readable: true,
    };

    const result = matchLabel(application, extracted, META);
    expect(fieldStatus(result, "countryOfOrigin")).toBe("match");
    expect(result.status).toBe("match");
  });

  it("matches a clean wine label", () => {
    const application: ApplicationFields = {
      brandName: "River Bench Vineyards",
      classType: "Cabernet Sauvignon",
      alcoholContent: "13.5% Alc. by Vol.",
      netContents: "750 mL",
      countryOfOrigin: "United States",
      productType: "wine",
    };
    const extracted: ExtractedLabel = {
      brandName: "RIVER BENCH VINEYARDS",
      fancifulName: null,
      classType: "Cabernet Sauvignon",
      alcoholContent: "13.5% alc by vol",
      netContents: "75 cl",
      bottlerNameAddress: null,
      countryOfOrigin: "United States",
      warningText: STATUTORY_WARNING,
      warningAllCapsPrefix: true,
      readable: true,
    };

    const result = matchLabel(application, extracted, META);
    expect(fieldStatus(result, "classType")).toBe("match");
    expect(fieldStatus(result, "alcoholContent")).toBe("match");
    expect(fieldStatus(result, "netContents")).toBe("match");
    expect(result.warning.status).toBe("match");
  });

  it("needs review when a beer application has ABV but the label omits it", () => {
    const application: ApplicationFields = {
      brandName: "Harbor Light",
      classType: "Pale Ale",
      alcoholContent: "5.4% Alc./Vol.",
      netContents: "12 fl oz",
      productType: "malt_beverage",
    };
    const extracted: ExtractedLabel = {
      brandName: "Harbor Light",
      fancifulName: null,
      classType: "Pale Ale",
      alcoholContent: null,
      netContents: "12 fl. oz.",
      bottlerNameAddress: null,
      countryOfOrigin: null,
      warningText: STATUTORY_WARNING,
      warningAllCapsPrefix: true,
      readable: true,
    };

    const result = matchLabel(application, extracted, META);
    expect(result.status).toBe("needs_review");
    expect(fieldStatus(result, "alcoholContent")).toBe("needs_review");
    expect(result.warning.status).toBe("match");
  });

  it("needs review and skips field fails when the image is unreadable", () => {
    const result = matchLabel(
      SPIRITS_APP,
      { ...SPIRITS_LABEL, readable: false, notes: "glare" },
      META,
    );
    expect(result.status).toBe("needs_review");
    expect(result.fields).toHaveLength(0);
    expect(result.message).toContain("could not read");
  });

  it("skips optional fields the application did not include", () => {
    const result = matchLabel(
      SPIRITS_APP,
      { ...SPIRITS_LABEL, countryOfOrigin: "United States" },
      META,
    );
    expect(fieldStatus(result, "countryOfOrigin")).toBeUndefined();
    expect(result.status).toBe("match");
  });

  it("treats a country stored in the bottler field as origin when the application has a country", () => {
    const application: ApplicationFields = {
      brandName: "River Bench Vineyards",
      classType: "Cabernet Sauvignon",
      alcoholContent: "13.5% Alc. by Vol.",
      netContents: "750 mL",
      countryOfOrigin: "United States",
      productType: "wine",
    };
    const extracted: ExtractedLabel = {
      brandName: "RIVER BENCH VINEYARDS",
      fancifulName: "NAPA VALLEY",
      classType: "Cabernet Sauvignon",
      alcoholContent: "13.5% Alc. by Vol.",
      netContents: "75 cl",
      bottlerNameAddress: "United States",
      countryOfOrigin: null,
      warningText: STATUTORY_WARNING,
      warningAllCapsPrefix: true,
      readable: true,
    };
    const result = matchLabel(application, extracted, META);
    expect(fieldStatus(result, "countryOfOrigin")).toBe("match");
    expect(result.status).toBe("match");
  });
});
