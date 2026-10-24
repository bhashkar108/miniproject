import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-3.8-flash";

export class GeminiConfigurationError extends Error {
  constructor() {
    super("Gemini is not configured. Please set the GEMINI_API_KEY environment variable.");
    this.name = "GeminiConfigurationError";
  }
}

export class GeminiRequestError extends Error {
  readonly providerStatus?: number;

  constructor(providerStatus?: number) {
    const message =
      providerStatus === 401 || providerStatus === 403
        ? "Gemini rejected the API key or request. Check that this key can use the Gemini API."
        : providerStatus === 404
          ? "The configured Gemini model is unavailable. Update the model configuration and try again."
        : providerStatus === 429
          ? "Gemini's request quota is exhausted. Check the key's quota or try again later."
          : providerStatus && providerStatus >= 500
            ? "Gemini is temporarily unavailable. Try again in a moment."
            : "The AI could not read this request. Try a smaller or clearer file.";
    super(message);
    this.name = "GeminiRequestError";
    this.providerStatus = providerStatus;
  }
}

function getProviderStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === "number" && Number.isInteger(status) ? status : undefined;
}

interface GeminiFilePart {
  mimeType: string;
  buffer: Buffer;
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigurationError();
  }
  return new GoogleGenAI({ apiKey });
}

function buildContents(prompt: string, file?: GeminiFilePart) {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];
  if (file) {
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.buffer.toString("base64"),
      },
    });
  }
  return [{ role: "user" as const, parts }];
}

export async function generateText(prompt: string, file?: GeminiFilePart): Promise<string> {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: buildContents(prompt, file),
      config: { maxOutputTokens: 16_000, temperature: 0.1 },
    });
  } catch (error) {
    if (error instanceof GeminiConfigurationError) throw error;
    throw new GeminiRequestError(getProviderStatus(error));
  }
  const text = response.text?.trim();
  if (!text) {
    throw new GeminiRequestError();
  }
  return text;
}

export async function generateJson<T>(
  prompt: string,
  file?: GeminiFilePart,
): Promise<T> {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: buildContents(prompt, file),
      config: {
        maxOutputTokens: 16_000,
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });
  } catch (error) {
    if (error instanceof GeminiConfigurationError) throw error;
    throw new GeminiRequestError(getProviderStatus(error));
  }
  const text = response.text?.trim();
  if (!text) {
    throw new GeminiRequestError();
  }
  const normalized = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(normalized) as T;
  } catch {
    throw new GeminiRequestError();
  }
}
