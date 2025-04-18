import { CliError } from "./error"
import { getOllamaModels } from "./ollama"

export type ModelInfo = { id: string; realId?: string }

export const MODEL_MAP: {
  [prefix: string]: ModelInfo[]
} = {
  gpt: [
    {
      id: "gpt-4o",
    },
    {
      id: "gpt-4o-mini",
    },
  ],
  openai: [
    {
      id: "openai-o1",
    },
    {
      id: "openai-o1-mini",
    },
    {
      id: "openai-o3-mini",
    },
  ],
  claude: [
    {
      id: "claude-3.5-haiku",
      realId: "claude-3-5-haiku-latest",
    },
    {
      id: "claude-3.5-sonnet",
      realId: "claude-3-5-sonnet-latest",
    },
  ],
  gemini: [
    {
      id: "gemini-2.0-flash",
      realId: "gemini-2.0-flash-exp",
    },
    {
      id: "gemini-2.0-flash-thinking",
      realId: "gemini-2.0-flash-thinking-exp",
    },
    {
      id: "gemini-1.5-pro",
      realId: "gemini-1.5-pro-latest",
    },
    {
      id: "gemini-1.5-flash",
      realId: "gemini-1.5-flash-latest",
    },
    {
      id: "gemini-pro",
    },
  ],
  groq: [
    {
      id: "groq-llama-3.3-70b",
      realId: "groq-llama-3.3-70b-versatile",
    },
    {
      id: "groq-llama-3.1-8b",
      realId: "groq-llama-3.1-8b-instant",
    },
    {
      id: "groq-llama3",
      realId: "groq-llama3-70b-8192",
    },
    {
      id: "groq-llama3-8b",
      realId: "groq-llama3-8b-8192",
    },
    {
      id: "groq-llama3-70b",
      realId: "groq-llama3-70b-8192",
    },
    {
      id: "groq-mixtral-8x7b",
      realId: "groq-mixtral-8x7b-32768",
    },
    {
      id: "groq-gemma",
      realId: "groq-gemma-7b-it",
    },
    {
      id: "groq-gemma-7b",
      realId: "groq-gemma-7b-it",
    },
  ],
  copilot: [
    {
      id: "copilot-gpt-4",
      realId: "gpt-4",
    },
    {
      id: "copilot-gpt-4o",
      realId: "gpt-4o",
    },
    {
      id: "copilot-o1-mini",
      realId: "o1-mini",
    },
    {
      id: "copilot-o1-preview",
      realId: "o1-preview",
    },
    {
      id: "copilot-o3-mini",
      realId: "o3-mini",
    },
    {
      id: "copilot-claude-3.5-sonnet",
      realId: "claude-3.5-sonnet",
    },
  ],
}

export const MODELS = Object.values(MODEL_MAP).flat()

export const MODEL_PREFIXES = Object.keys(MODEL_MAP)

export async function getAllModels(includeOllama?: boolean | "required") {
  let models = [...MODELS]

  if (includeOllama) {
    const ollamaModels = await getOllamaModels()
    if (ollamaModels.length === 0 && includeOllama === "required") {
      throw new CliError("no Ollama models available")
    }
    models = [...models, ...ollamaModels]
  }

  return models
}

export function getCheapModelId(modelId: string) {
  if (modelId.startsWith("gpt-")) return "gpt-4o-mini"

  if (modelId.startsWith("claude-")) return "claude-3-haiku-20240307"

  if (modelId.startsWith("gemini-")) return "gemini-pro"

  if (modelId.startsWith("groq-")) return "groq-llama3-8b-8192"

  if (modelId.startsWith("copilot-")) return "copilot-gpt-4o"

  if (modelId.startsWith("openai-")) return "gpt-4o-mini"

  return modelId
}

export function toProviderModelId(modelId: string) {
  if (modelId.startsWith("groq-")) {
    return modelId.replace("groq-", "")
  }
  return modelId
}
