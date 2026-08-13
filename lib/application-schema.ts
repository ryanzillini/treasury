import { z } from "zod";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export const applicationSchema = z.object({
  brandName: z.string().trim().min(1),
  fancifulName: z.string().trim().optional(),
  classType: z.string().trim().min(1),
  alcoholContent: z.string().trim().optional(),
  netContents: z.string().trim().min(1),
  bottlerNameAddress: z.string().trim().optional(),
  countryOfOrigin: z.string().trim().optional(),
  productType: z.enum(["wine", "malt_beverage", "distilled_spirits"]),
});
