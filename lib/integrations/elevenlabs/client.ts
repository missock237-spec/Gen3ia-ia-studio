/**
 * Client ElevenLabs — autorisations analysées pour le token fourni :
 * - tier "free" : 10 000 caracteres/mois, 3 voix personnalisees max
 * - Modeles TTS disponibles : eleven_v3, eleven_multilingual_v2 (FR),
 *   eleven_flash_v2_5, eleven_turbo_v2_5, eleven_turbo_v2, eleven_flash_v2
 * - Modeles speech-to-speech listes mais non exploites ici (usage free restreint)
 * Fonctionnalites actives pour le projet : synthese vocale (TTS) multilingue
 * + listing des voix disponibles. Le clonage vocal professionnel est hors quota.
 */

const API_BASE = "https://api.elevenlabs.io/v1";

export const ELEVENLABS_MODELS = [
  "eleven_multilingual_v2",
  "eleven_v3",
  "eleven_flash_v2_5",
  "eleven_turbo_v2_5",
] as const;

export type ElevenLabsModel =
  (typeof ELEVENLABS_MODELS)[number];

/** Voix par defaut : George - Warm (multilingue, stable, bibliotheque partagee). */
const DEFAULT_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";

const DEFAULT_MODEL: ElevenLabsModel =
  "eleven_multilingual_v2";

export function getElevenLabsApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not configured.",
    );
  }
  return apiKey;
}

export interface ElevenLabsVoice {
  voiceId: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  previewUrl?: string;
}

export async function listElevenLabsVoices(): Promise<
  ElevenLabsVoice[]
> {
  const response = await fetch(`${API_BASE}/voices`, {
    headers: { "xi-api-key": getElevenLabsApiKey() },
  });

  if (!response.ok) {
    throw new Error(
      `ElevenLabs voices returned ${response.status}.`,
    );
  }

  const data = (await response.json()) as {
    voices?: Array<{
      voice_id: string;
      name: string;
      category?: string;
      labels?: Record<string, string>;
      preview_url?: string;
    }>;
  };

  return (data.voices ?? []).map((voice) => ({
    voiceId: voice.voice_id,
    name: voice.name,
    category: voice.category ?? "library",
    labels: voice.labels ?? {},
    previewUrl: voice.preview_url,
  }));
}

async function resolveVoiceId(
  voiceId?: string,
): Promise<string> {
  if (voiceId && voiceId.trim().length > 0) {
    return voiceId.trim();
  }

  const configured =
    process.env.ELEVENLABS_VOICE_ID;
  if (configured) return configured;

  // Sans configuration explicite, tente une voix de la bibliotheque.
  try {
    const voices = await listElevenLabsVoices();
    const preferred = voices.find((voice) =>
      voice.voiceId === DEFAULT_VOICE_ID,
    );
    return (
      preferred?.voiceId ?? voices[0]?.voiceId ?? DEFAULT_VOICE_ID
    );
  } catch {
    return DEFAULT_VOICE_ID;
  }
}

export interface TextToSpeechResult {
  audioBase64: string;
  mimeType: string;
  voiceId: string;
  modelId: string;
  charactersUsed: number;
}

export async function elevenLabsTextToSpeech(
  options: {
    text: string;
    voiceId?: string;
    modelId?: string;
  },
): Promise<TextToSpeechResult> {
  const voiceId = await resolveVoiceId(
    options.voiceId,
  );

  const modelId =
    options.modelId &&
    (ELEVENLABS_MODELS as readonly string[]).includes(
      options.modelId,
    )
      ? options.modelId
      : DEFAULT_MODEL;

  const response = await fetch(
    `${API_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": getElevenLabsApiKey(),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text: options.text,
        model_id: modelId,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `ElevenLabs TTS returned ${response.status}: ${detail.slice(0, 200)}`,
    );
  }

  const audio = Buffer.from(
    await response.arrayBuffer(),
  );

  if (audio.byteLength === 0) {
    throw new Error(
      "ElevenLabs TTS returned empty audio.",
    );
  }

  return {
    audioBase64: audio.toString("base64"),
    mimeType: "audio/mpeg",
    voiceId,
    modelId,
    charactersUsed: options.text.length,
  };
}
