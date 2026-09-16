import { z } from "zod";

import type {
  ToolDefinition,
} from "@/lib/tools/types";

import {
  ELEVENLABS_MODELS,
  elevenLabsTextToSpeech,
  listElevenLabsVoices,
} from "./client";

const MAX_TTS_CHARS = 2500;

const SpeakInput = z.object({
  text: z
    .string()
    .min(1)
    .max(MAX_TTS_CHARS),

  voiceId: z
    .string()
    .min(10)
    .max(64)
    .optional(),

  modelId: z
    .enum(ELEVENLABS_MODELS)
    .optional(),
});

interface SpeakOutput {
  audioDataUri: string;
  mimeType: string;
  voiceId: string;
  modelId: string;
  charactersUsed: number;
  note: string;
}

/**
 * Synthese vocale a partir d'un texte (voix naturelles multilingues,
 * francais supporte via eleven_multilingual_v2).
 */
export const voiceSpeakTool: ToolDefinition<
  z.infer<typeof SpeakInput>,
  SpeakOutput
> = {
  id: "voice.speak",

  name: "Voice Speak",

  description:
    "Convertit un texte en audio MP3 naturel (voix ElevenLabs, francais supporte). " +
    `Maximum ${MAX_TTS_CHARS} caracteres par appel (quota mensuel du compte).`,

  category: "system",

  risk: "low",

  inputSchema: SpeakInput,

  async execute(
    input,
    _context,
  ): Promise<SpeakOutput> {
    const result =
      await elevenLabsTextToSpeech({
        text: input.text,
        voiceId: input.voiceId,
        modelId: input.modelId,
      });

    return {
      audioDataUri: `data:${result.mimeType};base64,${result.audioBase64}`,

      mimeType: result.mimeType,

      voiceId: result.voiceId,

      modelId: result.modelId,

      charactersUsed: result.charactersUsed,

      note: "Audio MP3 encode en base64 (data URI) — lisible dans le navigateur ou telechargeable.",
    };
  },
};

const ListVoicesInput = z.object({});

interface ListVoicesOutput {
  voices: Array<{
    voiceId: string;
    name: string;
    category: string;
    language?: string;
    accent?: string;
    previewUrl?: string;
  }>;
  defaultVoiceHint: string;
}

/** Liste les voix disponibles sur le compte (bibliotheque + personnalisees). */
export const voiceListTool: ToolDefinition<
  z.infer<typeof ListVoicesInput>,
  ListVoicesOutput
> = {
  id: "voice.list",

  name: "Voice List",

  description:
    "Liste les voix ElevenLabs disponibles (nom, langue, accent, extrait d'ecoute).",

  category: "system",

  risk: "low",

  inputSchema: ListVoicesInput,

  async execute(
    _input,
    _context,
  ): Promise<ListVoicesOutput> {
    const voices =
      await listElevenLabsVoices();

    return {
      voices: voices.map((voice) => ({
        voiceId: voice.voiceId,

        name: voice.name,

        category: voice.category,

        language: voice.labels.language,

        accent: voice.labels.accent,

        previewUrl: voice.previewUrl,
      })),

      defaultVoiceHint:
        "Utiliser un voiceId retourne par cet outil dans voice.speak ; sans voiceId, la voix par defaut du serveur est appliquee.",
    };
  },
};
