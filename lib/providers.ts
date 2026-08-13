import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { VisionProvider } from "./types";

export class MissingProviderKeyError extends Error {
  constructor(provider: VisionProvider, envName: string) {
    super(`Missing ${envName} for VISION_PROVIDER=${provider}`);
    this.name = "MissingProviderKeyError";
  }
}

const PROVIDERS: Record<
  VisionProvider,
  { modelId: string; envName: string; create: () => LanguageModel }
> = {
  openai: {
    modelId: "gpt-5-nano",
    envName: "OPENAI_API_KEY",
    create: () => openai("gpt-5-nano"),
  },
  google: {
    modelId: "gemini-2.5-flash",
    envName: "GOOGLE_GENERATIVE_AI_API_KEY",
    create: () => google("gemini-2.5-flash"),
  },
  anthropic: {
    modelId: "claude-sonnet-4-5",
    envName: "ANTHROPIC_API_KEY",
    create: () => anthropic("claude-sonnet-4-5"),
  },
};

export function resolveVisionProvider(): VisionProvider {
  const value = process.env.VISION_PROVIDER ?? "openai";
  if (value === "openai" || value === "google" || value === "anthropic") {
    return value;
  }
  throw new Error(
    `VISION_PROVIDER must be openai, google, or anthropic (got ${value})`,
  );
}

export function getVisionModel(): {
  provider: VisionProvider;
  modelId: string;
  model: LanguageModel;
} {
  const provider = resolveVisionProvider();
  const config = PROVIDERS[provider];
  if (!process.env[config.envName]) {
    throw new MissingProviderKeyError(provider, config.envName);
  }

  return {
    provider,
    modelId: config.modelId,
    model: config.create(),
  };
}
