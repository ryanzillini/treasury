import { FIELD_LABELS, type FieldResult } from "./types";
import { blankToNull, normalizeWhitespace } from "./normalize";
import { STATUTORY_WARNING } from "./statutory-warning";

export { STATUTORY_WARNING } from "./statutory-warning";

export const MISSING_WARNING_REASON =
  "Warning not found on this image. If it is on another panel, upload that image.";

const PREFIX = "GOVERNMENT WARNING";
const PREFIX_PATTERN = /^\s*(government\s+warning)\s*:/i;

function statuteBody(): string {
  return normalizeWhitespace(STATUTORY_WARNING.slice(PREFIX.length + 1));
}

function compactWarning(value: string): string {
  return normalizeWhitespace(value).replace(/\s+/g, "").toLowerCase();
}

export function extractWarningPrefix(
  warningText: string,
): { prefix: string; body: string } | null {
  const match = warningText.match(PREFIX_PATTERN);
  if (!match || match.index == null) return null;
  const prefix = match[1].replace(/\s+/g, " ");
  const after = warningText.slice(match.index + match[0].length);
  return { prefix, body: normalizeWhitespace(after) };
}

export function checkGovernmentWarning(
  warningText: string | null | undefined,
  _warningAllCapsPrefix?: boolean | null,
): FieldResult {
  const text = blankToNull(warningText);

  if (!text) {
    return {
      field: "warning",
      label: FIELD_LABELS.warning,
      status: "fail",
      applicationValue: STATUTORY_WARNING,
      labelValue: null,
      reason: MISSING_WARNING_REASON,
    };
  }

  const parts = extractWarningPrefix(text);
  if (!parts) {
    return {
      field: "warning",
      label: FIELD_LABELS.warning,
      status: "fail",
      applicationValue: STATUTORY_WARNING,
      labelValue: text,
      reason:
        "The label does not start with the required government warning wording.",
    };
  }

  const textSaysAllCaps = parts.prefix === PREFIX;

  if (!textSaysAllCaps) {
    return {
      field: "warning",
      label: FIELD_LABELS.warning,
      status: "fail",
      applicationValue: STATUTORY_WARNING,
      labelValue: text,
      reason:
        'The first two words must be "GOVERNMENT WARNING" in all capital letters.',
    };
  }

  const requiredBody = statuteBody();
  if (
    parts.body !== requiredBody &&
    compactWarning(parts.body) !== compactWarning(requiredBody)
  ) {
    return {
      field: "warning",
      label: FIELD_LABELS.warning,
      status: "fail",
      applicationValue: STATUTORY_WARNING,
      labelValue: text,
      reason:
        "The warning wording must match the required statement word for word.",
    };
  }

  return {
    field: "warning",
    label: FIELD_LABELS.warning,
    status: "match",
    applicationValue: STATUTORY_WARNING,
    labelValue: text,
    reason: "The warning matches the required statement.",
  };
}
