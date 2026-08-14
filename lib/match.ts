import {
  alcoholValuesMatch,
  blankToNull,
  classifyProductType,
  nameSimilarity,
  normalizeName,
  normalizeOrigin,
  oneContainsTheOther,
  parseAlcohol,
  volumesMatch,
} from "./normalize";
import {
  FIELD_LABELS,
  PRODUCT_TYPE_LABELS,
  type ApplicationFields,
  type CheckStatus,
  type ExtractedLabel,
  type FieldKey,
  type FieldResult,
  type VerifyResult,
} from "./types";
import { checkGovernmentWarning } from "./warning";

const UNREADABLE_MESSAGE =
  "We could not read this label. Please try a clearer photo.";

function result(
  field: FieldKey,
  status: CheckStatus,
  applicationValue: string | null,
  labelValue: string | null,
  reason: string,
): FieldResult {
  return {
    field,
    label: FIELD_LABELS[field],
    status,
    applicationValue,
    labelValue,
    reason,
  };
}

function compareNames(
  field: FieldKey,
  applicationValue: string | null,
  labelValue: string | null,
  options: { required: boolean; containCountsAsMatch: boolean },
): FieldResult | null {
  const application = blankToNull(applicationValue);
  const label = blankToNull(labelValue);

  if (!application && !label) return null;

  if (application && !label) {
    return result(
      field,
      options.required ? "fail" : "needs_review",
      application,
      null,
      options.required
        ? `${FIELD_LABELS[field]} is on the application but was not found on the label.`
        : `${FIELD_LABELS[field]} is on the application but was not found on the label. An agent should confirm.`,
    );
  }

  if (!application && label) {
    if (!options.required) return null;
    return result(
      field,
      "needs_review",
      null,
      label,
      `${FIELD_LABELS[field]} is on the label but was not on the application.`,
    );
  }

  if (!application || !label) return null;

  if (normalizeName(application) === normalizeName(label)) {
    return result(
      field,
      "match",
      application,
      label,
      "The names match.",
    );
  }

  if (
    field === "countryOfOrigin" &&
    normalizeOrigin(application) === normalizeOrigin(label)
  ) {
    return result(
      field,
      "match",
      application,
      label,
      "The names match.",
    );
  }

  if (options.containCountsAsMatch && oneContainsTheOther(application, label)) {
    return result(
      field,
      "match",
      application,
      label,
      "The class or type names refer to the same product.",
    );
  }

  const score = nameSimilarity(application, label);

  if (score >= 0.9) {
    return result(field, "match", application, label, "The names match.");
  }

  if (oneContainsTheOther(application, label) || score >= 0.75) {
    return result(
      field,
      "needs_review",
      application,
      label,
      "The names are similar, but an agent should confirm they are the same.",
    );
  }

  return result(
    field,
    "fail",
    application,
    label,
    "The names do not match.",
  );
}

function compareProductType(
  application: ApplicationFields,
  extracted: ExtractedLabel,
): FieldResult | null {
  const classified = classifyProductType(extracted.classType);
  const applicationValue = PRODUCT_TYPE_LABELS[application.productType];

  if (classified.kind === "unknown") return null;

  if (classified.kind === "ambiguous") {
    const labelValue = classified.candidates
      .map((candidate) => PRODUCT_TYPE_LABELS[candidate])
      .join(" or ");
    return {
      field: "productType",
      label: FIELD_LABELS.productType,
      status: "needs_review",
      applicationValue,
      labelValue,
      reason:
        "The class or type on the label could belong to more than one product type. An agent should confirm.",
    };
  }

  const labelValue = PRODUCT_TYPE_LABELS[classified.productType];

  if (classified.productType === application.productType) {
    return {
      field: "productType",
      label: FIELD_LABELS.productType,
      status: "match",
      applicationValue,
      labelValue,
      reason: "The application product type matches the class or type on the label.",
    };
  }

  return {
    field: "productType",
    label: FIELD_LABELS.productType,
    status: "fail",
    applicationValue,
    labelValue,
    reason: `The application is filed as ${applicationValue.toLowerCase()}, but the label class or type reads as ${labelValue.toLowerCase()}.`,
  };
}

function compareAlcohol(
  application: ApplicationFields,
  extracted: ExtractedLabel,
): FieldResult | null {
  const applicationValue = blankToNull(application.alcoholContent);
  const labelValue = blankToNull(extracted.alcoholContent);
  const parsedApp = parseAlcohol(applicationValue);
  const parsedLabel = parseAlcohol(labelValue);
  const labelMissing = parsedLabel.abv == null;
  const isBeer = application.productType === "malt_beverage";

  if (labelMissing) {
    if (isBeer) {
      if (!applicationValue) return null;
      return result(
        "alcoholContent",
        "needs_review",
        applicationValue,
        null,
        "Beer labels are not always required to show alcohol content. An agent should confirm.",
      );
    }

    return result(
      "alcoholContent",
      "fail",
      applicationValue,
      null,
      "Alcohol content was not found on the label.",
    );
  }

  if (!applicationValue || parsedApp.abv == null) {
    return result(
      "alcoholContent",
      "needs_review",
      applicationValue,
      labelValue,
      "Alcohol content is on the label but was not entered on the application.",
    );
  }

  if (alcoholValuesMatch(parsedApp, parsedLabel)) {
    return result(
      "alcoholContent",
      "match",
      applicationValue,
      labelValue,
      "The alcohol content matches.",
    );
  }

  if (
    parsedApp.abv != null &&
    parsedLabel.abv != null &&
    Math.abs(parsedApp.abv - parsedLabel.abv) <= 0.05 &&
    parsedApp.proof != null &&
    parsedLabel.proof != null
  ) {
    return result(
      "alcoholContent",
      "needs_review",
      applicationValue,
      labelValue,
      "The percent alcohol matches, but the proof figures do not. An agent should confirm.",
    );
  }

  return result(
    "alcoholContent",
    "fail",
    applicationValue,
    labelValue,
    "The alcohol content does not match.",
  );
}

function compareVolume(
  applicationValue: string,
  labelValue: string | null,
): FieldResult {
  const application = blankToNull(applicationValue);
  const label = blankToNull(labelValue);

  if (!label) {
    return result(
      "netContents",
      "fail",
      application,
      null,
      "Net contents was not found on the label.",
    );
  }

  const matched = volumesMatch(application, label);
  if (matched === null) {
    return result(
      "netContents",
      "needs_review",
      application,
      label,
      "Net contents could not be compared automatically. An agent should confirm.",
    );
  }

  if (matched) {
    return result(
      "netContents",
      "match",
      application,
      label,
      "The net contents match.",
    );
  }

  return result(
    "netContents",
    "fail",
    application,
    label,
    "The net contents do not match.",
  );
}

function countryFromExtract(
  application: ApplicationFields,
  extracted: ExtractedLabel,
): string | null {
  const country = blankToNull(extracted.countryOfOrigin);
  if (country) return country;

  const appCountry = blankToNull(application.countryOfOrigin);
  const bottler = blankToNull(extracted.bottlerNameAddress);
  if (appCountry && bottler && nameSimilarity(appCountry, bottler) >= 0.9) {
    return bottler;
  }

  return null;
}

function overallStatus(parts: FieldResult[]): CheckStatus {
  if (parts.some((part) => part.status === "fail")) return "fail";
  if (parts.some((part) => part.status === "needs_review")) return "needs_review";
  return "match";
}

export function matchLabel(
  application: ApplicationFields,
  extracted: ExtractedLabel,
  meta: { elapsedMs: number; provider: string; model: string },
): VerifyResult {
  if (!extracted.readable) {
    const warning: FieldResult = {
      field: "warning",
      label: FIELD_LABELS.warning,
      status: "needs_review",
      applicationValue: null,
      labelValue: extracted.warningText,
      reason: UNREADABLE_MESSAGE,
    };

    return {
      status: "needs_review",
      fields: [],
      warning,
      elapsedMs: meta.elapsedMs,
      provider: meta.provider,
      model: meta.model,
      message: UNREADABLE_MESSAGE,
    };
  }

  const fields = [
    compareProductType(application, extracted),
    compareNames("brandName", application.brandName, extracted.brandName, {
      required: true,
      containCountsAsMatch: false,
    }),
    compareNames(
      "fancifulName",
      application.fancifulName ?? null,
      extracted.fancifulName,
      { required: false, containCountsAsMatch: false },
    ),
    compareNames("classType", application.classType, extracted.classType, {
      required: true,
      containCountsAsMatch: true,
    }),
    compareAlcohol(application, extracted),
    compareVolume(application.netContents, extracted.netContents),
    compareNames(
      "bottlerNameAddress",
      application.bottlerNameAddress ?? null,
      extracted.bottlerNameAddress,
      { required: false, containCountsAsMatch: false },
    ),
    compareNames(
      "countryOfOrigin",
      application.countryOfOrigin ?? null,
      countryFromExtract(application, extracted),
      { required: false, containCountsAsMatch: false },
    ),
  ].filter((field): field is FieldResult => field != null);

  const warning = checkGovernmentWarning(
    extracted.warningText,
    extracted.warningAllCapsPrefix,
  );

  return {
    status: overallStatus([...fields, warning]),
    fields,
    warning,
    elapsedMs: meta.elapsedMs,
    provider: meta.provider,
    model: meta.model,
  };
}
