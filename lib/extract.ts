import { generateText, Output } from "ai";
import { z } from "zod";
import { getVisionModel } from "./providers";
import type { ExtractedLabel } from "./types";

const extractedSchema = z.object({
  readable: z
    .boolean()
    .describe("False if glare, blur, crop, or contrast makes the label unreadable."),
  notes: z
    .string()
    .nullable()
    .describe("Short note about image quality. Null if the label is readable."),
  brandName: z.string().nullable(),
  fancifulName: z.string().nullable(),
  classType: z.string().nullable(),
  alcoholContent: z.string().nullable(),
  netContents: z.string().nullable(),
  bottlerNameAddress: z.string().nullable(),
  countryOfOrigin: z.string().nullable(),
  warningText: z
    .string()
    .nullable()
    .describe(
      "The government warning transcribed character for character, or null if it is not on this image.",
    ),
  warningAllCapsPrefix: z
    .boolean()
    .nullable()
    .describe(
      "True only if the first two words appear as GOVERNMENT WARNING in all capital letters. False if they appear in any other case. Null if no warning is present.",
    ),
});

const SYSTEM_INSTRUCTIONS = `You are reading one alcohol beverage label image for a TTB compliance check.

Transcribe only what is printed. Do not correct spelling, casing, or punctuation.
Copy the government health warning character for character when it is present.
Copy the first two words of the warning exactly as printed. If they are "Government Warning", write "Government Warning". Do not change that into "GOVERNMENT WARNING".
Set warningAllCapsPrefix to true only if those first two words are GOVERNMENT WARNING in all caps.
classType is the beverage class or type, such as Kentucky Straight Bourbon Whiskey, Cabernet Sauvignon, or Pale Ale. It is never words like DISTILLERY, BREWING CO, VINEYARDS, or EST.
fancifulName is an extra product name besides the brand. A region such as NAPA VALLEY is not a fanciful name. Repeat of the brand is not a fanciful name. If none, return null.
bottlerNameAddress is the name and street or city address of the bottler or producer. A country name alone is not a bottler address.
countryOfOrigin is only the country name used as origin (for example "United States" or "France"). If the label says "Product of the United States", return "United States", not the whole phrase. A city or state in a bottler address is not country of origin. If origin is not printed, return null. Do not infer USA.
If the image is too washed out, glare-covered, blurred, or otherwise unreadable, set readable to false and leave the fields null. Do not guess hidden text.
If a field is not on this image, return null for that field.`;

const USER_PROMPT = "Read this label and extract the printed fields.";

export async function extractLabel(
  image: Buffer,
  mediaType: string,
): Promise<{ extracted: ExtractedLabel; provider: string; model: string }> {
  const { provider, modelId, model } = getVisionModel();

  const result = await generateText({
    model,
    output: Output.object({ schema: extractedSchema }),
    system: SYSTEM_INSTRUCTIONS,
    providerOptions: {
      openai: { reasoningEffort: "minimal" },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: USER_PROMPT },
          { type: "file", data: image, mediaType },
        ],
      },
    ],
  });

  if (!result.output) {
    throw new Error("The vision model did not return label fields.");
  }

  return {
    extracted: result.output,
    provider,
    model: modelId,
  };
}
