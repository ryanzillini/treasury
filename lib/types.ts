export type ProductType = "wine" | "malt_beverage" | "distilled_spirits";

export type CheckStatus = "match" | "fail" | "needs_review";

export type VisionProvider = "openai" | "google" | "anthropic";

export type FieldKey =
  | "productType"
  | "brandName"
  | "fancifulName"
  | "classType"
  | "alcoholContent"
  | "netContents"
  | "bottlerNameAddress"
  | "countryOfOrigin";

export interface ApplicationFields {
  brandName: string;
  fancifulName?: string;
  classType: string;
  alcoholContent?: string;
  netContents: string;
  bottlerNameAddress?: string;
  countryOfOrigin?: string;
  productType: ProductType;
}

export interface ExtractedLabel {
  brandName: string | null;
  fancifulName: string | null;
  classType: string | null;
  alcoholContent: string | null;
  netContents: string | null;
  bottlerNameAddress: string | null;
  countryOfOrigin: string | null;
  warningText: string | null;
  warningAllCapsPrefix: boolean | null;
  readable: boolean;
  notes?: string | null;
}

export interface FieldResult {
  field: FieldKey | "warning";
  label: string;
  status: CheckStatus;
  applicationValue: string | null;
  labelValue: string | null;
  reason: string;
}

export interface VerifyResult {
  status: CheckStatus;
  fields: FieldResult[];
  warning: FieldResult;
  elapsedMs: number;
  provider: string;
  model: string;
  message?: string;
}

export const FIELD_LABELS: Record<FieldKey | "warning", string> = {
  productType: "Product type",
  brandName: "Brand name",
  fancifulName: "Fanciful name",
  classType: "Class / type",
  alcoholContent: "Alcohol content",
  netContents: "Net contents",
  bottlerNameAddress: "Bottler name and address",
  countryOfOrigin: "Country of origin",
  warning: "Government warning",
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  wine: "Wine",
  malt_beverage: "Beer",
  distilled_spirits: "Spirits",
};
