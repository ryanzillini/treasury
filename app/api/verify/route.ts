import { matchLabel } from "@/lib/match";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  applicationSchema,
} from "@/lib/application-schema";
import { extractLabel } from "@/lib/extract";
import { getFixture } from "@/lib/fixtures";
import { MissingProviderKeyError } from "@/lib/providers";

export const maxDuration = 15;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const started = Date.now();

  try {
    const form = await request.formData();
    const image = form.get("image");
    const applicationRaw = form.get("application");

    if (!(image instanceof File)) {
      return errorResponse("Please add a label photo.", 400);
    }

    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return errorResponse("Please use a PNG, JPG, or WebP photo.", 400);
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return errorResponse("That photo is too large. Please use a file under 4 MB.", 400);
    }

    if (typeof applicationRaw !== "string") {
      return errorResponse("Please fill in the application fields.", 400);
    }

    const parsedApplication = applicationSchema.safeParse(
      JSON.parse(applicationRaw),
    );
    if (!parsedApplication.success) {
      return errorResponse(
        "Please fill in brand name, class or type, and net contents.",
        400,
      );
    }

    const application = parsedApplication.data;
    if (
      application.productType !== "malt_beverage" &&
      !application.alcoholContent
    ) {
      return errorResponse(
        "Please enter the alcohol content from the application.",
        400,
      );
    }

    const fixtureId = form.get("fixtureId");
    const fixture =
      typeof fixtureId === "string" ? getFixture(fixtureId) : undefined;

    try {
      const bytes = Buffer.from(await image.arrayBuffer());
      const { extracted, provider, model } = await extractLabel(
        bytes,
        image.type === "image/jpg" ? "image/jpeg" : image.type,
      );

      return Response.json(
        matchLabel(application, extracted, {
          elapsedMs: Date.now() - started,
          provider,
          model,
        }),
      );
    } catch (error) {
      if (error instanceof MissingProviderKeyError && fixture) {
        return Response.json(
          matchLabel(application, fixture.extraction, {
            elapsedMs: Date.now() - started,
            provider: "fixture",
            model: "recorded",
          }),
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof MissingProviderKeyError) {
      console.error(error.message);
      return errorResponse(
        "This demo is not connected to a vision service.",
        503,
      );
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Please fill in the application fields.", 400);
    }

    console.error(error);
    return errorResponse("Check did not finish. Try again.", 500);
  }
}
