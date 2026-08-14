import type { ProductType } from "./types";

const CURLY_SINGLE = /[\u2018\u2019\u201A\u201B]/g;
const CURLY_DOUBLE = /[\u201C\u201D\u201E\u201F]/g;

export function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(CURLY_SINGLE, "'")
    .replace(CURLY_DOUBLE, '"')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ORIGIN_PREFIX =
  /^(product of|produced in|wine of|made in|bottled in|imported from)(\s+the)?\s+/;

export function normalizeOrigin(value: string): string {
  return normalizeName(value).replace(ORIGIN_PREFIX, "").trim();
}

const SPIRIT_TERMS = [
  "whiskey",
  "whisky",
  "bourbon",
  "scotch",
  "rum",
  "gin",
  "vodka",
  "brandy",
  "cognac",
  "tequila",
  "mezcal",
  "liqueur",
  "cordial",
  "moonshine",
  "spirit",
  "spirits",
];

const WINE_TERMS = [
  "wine",
  "cabernet",
  "merlot",
  "chardonnay",
  "pinot",
  "sauvignon",
  "riesling",
  "zinfandel",
  "champagne",
  "sparkling",
  "prosecco",
  "sherry",
  "port",
  "vermouth",
  "moscato",
  "syrah",
  "malbec",
];

const BEER_TERMS = [
  "beer",
  "ale",
  "lager",
  "stout",
  "porter",
  "pilsner",
  "pilsener",
  "ipa",
  "malt beverage",
  "malt liquor",
];

function hasTerm(normalized: string, term: string): boolean {
  const escaped = term.replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(normalized);
}

export function inferProductType(
  classType: string | null | undefined,
): ProductType | null {
  const text = classType ? normalizeName(classType) : "";
  if (!text) return null;

  const hits = new Set<ProductType>();
  if (SPIRIT_TERMS.some((term) => hasTerm(text, term))) {
    hits.add("distilled_spirits");
  }
  if (WINE_TERMS.some((term) => hasTerm(text, term))) {
    hits.add("wine");
  }
  if (BEER_TERMS.some((term) => hasTerm(text, term))) {
    hits.add("malt_beverage");
  }

  if (hits.size === 1) return [...hits][0];
  return null;
}

export function normalizeWhitespace(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array<number>(cols).fill(0),
  );

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

export function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const longest = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / longest;
}

export function nameSimilarity(left: string, right: string): number {
  return similarity(normalizeName(left), normalizeName(right));
}

export function oneContainsTheOther(left: string, right: string): boolean {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b || a === b) return false;
  return a.includes(b) || b.includes(a);
}

export interface ParsedAlcohol {
  abv: number | null;
  proof: number | null;
}

export function parseAlcohol(
  value: string | null | undefined,
): ParsedAlcohol {
  const text = blankToNull(value);
  if (!text) return { abv: null, proof: null };

  const lower = text.toLowerCase();
  const percent = lower.match(/(\d+(?:\.\d+)?)\s*%/);
  const proof = lower.match(/(\d+(?:\.\d+)?)\s*proof/);

  let abv = percent ? Number(percent[1]) : null;
  const proofValue = proof ? Number(proof[1]) : null;

  if (abv == null && proofValue != null) {
    abv = proofValue / 2;
  }

  return { abv, proof: proofValue };
}

export function alcoholValuesMatch(
  application: ParsedAlcohol,
  label: ParsedAlcohol,
  epsilon = 0.05,
): boolean {
  if (application.abv == null || label.abv == null) return false;
  if (Math.abs(application.abv - label.abv) > epsilon) return false;

  if (application.proof != null && label.proof != null) {
    return Math.abs(application.proof - label.proof) <= epsilon * 2;
  }

  return true;
}

export interface ParsedVolume {
  milliliters: number | null;
  raw: string | null;
}

const VOLUME_PATTERN =
  /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|fluid\s*ounces?|ml|milliliters?|cl|centiliters?|l|liters?|litres?|oz)\b/i;

export function parseVolume(value: string | null | undefined): ParsedVolume {
  const text = blankToNull(value);
  if (!text) return { milliliters: null, raw: null };

  const match = text.match(VOLUME_PATTERN);
  if (!match) return { milliliters: null, raw: text };

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase().replace(/\s+/g, " ").replace(/\./g, "");

  let milliliters: number | null = null;
  if (unit === "ml" || unit.startsWith("milliliter")) {
    milliliters = amount;
  } else if (unit === "cl" || unit.startsWith("centiliter")) {
    milliliters = amount * 10;
  } else if (unit === "l" || unit.startsWith("liter") || unit.startsWith("litre")) {
    milliliters = amount * 1000;
  } else if (unit.includes("fl") || unit === "oz" || unit.startsWith("fluid")) {
    milliliters = amount * 29.5735;
  }

  return { milliliters, raw: text };
}

export function volumesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
  epsilonMl = 1,
): boolean | null {
  const a = parseVolume(left);
  const b = parseVolume(right);
  if (a.milliliters == null || b.milliliters == null) return null;
  return Math.abs(a.milliliters - b.milliliters) <= epsilonMl;
}
