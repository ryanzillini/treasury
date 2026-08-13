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

const EXTRACT_PROMPT = `You are reading one alcohol beverage label image for a TTB compliance check.

Transcribe only what is printed. Do not correct spelling, casing, or punctuation.
Copy the government health warning character for character when it is present.
Set warningAllCapsPrefix to true only if those first two words are GOVERNMENT WARNING in all caps.
If the image is too washed out, glare-covered, or otherwise unreadable, set readable to false and leave the fields null.
If a field is not on this image, return null for that field.`;

export async function extractLabel(
  image: Buffer,
  mediaType: string,
): Promise<{ extracted: ExtractedLabel; provider: string; model: string }> {
  const { provider, modelId, model } = getVisionModel();

  const result = await generateText({
    model,
    output: Output.object({ schema: extractedSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: EXTRACT_PROMPT },
          { type: "image", image, mediaType },
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
