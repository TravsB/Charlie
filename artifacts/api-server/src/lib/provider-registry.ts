export const OPENAI_PROVIDER_KEY = "openai" as const;
export const OPENAI_SECRET_REF = "OPENAI_API_KEY" as const;

export const providerCapabilityKeys = [
  "text-generation",
  "streaming",
] as const;

export type ProviderCapabilityKey = (typeof providerCapabilityKeys)[number];
export type ProviderErrorCode =
  | "missing_credential"
  | "invalid_credential"
  | "model_unavailable"
  | "rate_limited"
  | "provider_unavailable"
  | "invalid_provider_response";

export type ProviderModelOption = {
  id: string;
  capabilities: ProviderCapabilityKey[];
};

export type ProviderUsageReport = {
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: null;
  costStatus: "unknown";
  currency: "USD";
};

export type ProviderTextResult = {
  providerKey: typeof OPENAI_PROVIDER_KEY;
  modelIdentifier: string;
  text: string;
  usage: ProviderUsageReport;
};

export class ProviderAdapterError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    readonly httpStatus?: number,
  ) {
    super(code);
    this.name = "ProviderAdapterError";
  }
}

export interface ModelProviderAdapter {
  readonly providerKey: typeof OPENAI_PROVIDER_KEY;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilityKey[];
  isConfigured(): boolean;
  listModels(): Promise<ProviderModelOption[]>;
  validateModel(modelIdentifier: string): Promise<ProviderModelOption>;
  generateText(
    modelIdentifier: string,
    prompt: string,
  ): Promise<ProviderTextResult>;
}

type OpenAIModelsResponse = {
  data?: Array<{ id?: unknown }>;
};

type OpenAICompletionResponse = {
  model?: unknown;
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
  };
};

function isTextModelId(id: string): boolean {
  const normalized = id.toLowerCase();
  const likelyTextModel =
    normalized.startsWith("gpt-") || /^o[1-9](?:-|$)/.test(normalized);
  const nonTextMarkers = [
    "audio",
    "computer-use",
    "deep-research",
    "embedding",
    "image",
    "moderation",
    "realtime",
    "search",
    "transcribe",
    "tts",
    "whisper",
  ];

  return (
    likelyTextModel &&
    !nonTextMarkers.some((marker) => normalized.includes(marker))
  );
}

function tokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export class OpenAIProviderAdapter implements ModelProviderAdapter {
  readonly providerKey = OPENAI_PROVIDER_KEY;
  readonly displayName = "OpenAI";
  readonly capabilities: ProviderCapabilityKey[] = [
    "text-generation",
    "streaming",
  ];

  constructor(
    private readonly getCredential: () => string | undefined = () =>
      process.env[OPENAI_SECRET_REF],
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.getCredential()?.trim());
  }

  async listModels(): Promise<ProviderModelOption[]> {
    const response = await this.request("/models");
    const payload = (await response.json()) as OpenAIModelsResponse;
    if (!Array.isArray(payload.data)) {
      throw new ProviderAdapterError("invalid_provider_response");
    }

    return payload.data
      .map((model) => (typeof model.id === "string" ? model.id : null))
      .filter((id): id is string => id !== null && isTextModelId(id))
      .sort((left, right) => left.localeCompare(right))
      .map((id) => ({ id, capabilities: [...this.capabilities] }));
  }

  async validateModel(modelIdentifier: string): Promise<ProviderModelOption> {
    const models = await this.listModels();
    const model = models.find(({ id }) => id === modelIdentifier);
    if (!model) {
      throw new ProviderAdapterError("model_unavailable");
    }
    return model;
  }

  async generateText(
    modelIdentifier: string,
    prompt: string,
  ): Promise<ProviderTextResult> {
    const response = await this.request("/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelIdentifier,
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 8192,
      }),
    });

    const payload = (await response.json()) as OpenAICompletionResponse;
    const text = payload.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new ProviderAdapterError("invalid_provider_response");
    }

    return {
      providerKey: this.providerKey,
      modelIdentifier:
        typeof payload.model === "string" ? payload.model : modelIdentifier,
      text,
      usage: {
        inputTokens: tokenCount(payload.usage?.prompt_tokens),
        outputTokens: tokenCount(payload.usage?.completion_tokens),
        estimatedCost: null,
        costStatus: "unknown",
        currency: "USD",
      },
    };
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    const credential = this.getCredential()?.trim();
    if (!credential) {
      throw new ProviderAdapterError("missing_credential");
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`https://api.openai.com/v1${path}`, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${credential}`,
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ProviderAdapterError("provider_unavailable");
    }

    if (!response.ok) {
      const code: ProviderErrorCode =
        response.status === 401 || response.status === 403
          ? "invalid_credential"
          : response.status === 429
            ? "rate_limited"
            : "provider_unavailable";
      throw new ProviderAdapterError(code, response.status);
    }

    return response;
  }
}

export const openAIProvider = new OpenAIProviderAdapter();

export const providerRegistry: Readonly<
  Record<string, ModelProviderAdapter>
> = {
  [OPENAI_PROVIDER_KEY]: openAIProvider,
};

export function getProviderAdapter(
  providerKey: string,
): ModelProviderAdapter | undefined {
  return providerRegistry[providerKey];
}
