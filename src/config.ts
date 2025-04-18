import JoyCon from "joycon"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import toml from "smol-toml"
import { z } from "zod"

export const configDirPath = path.join(os.homedir(), ".config", "terminal-ai")

const AICommandVariableSchema = z.union([
  z.string().describe("a shell command to run"),
  z
    .object({
      type: z.literal("input"),
      message: z.string(),
    })
    .describe("get text input from the user"),
  z
    .object({
      type: z.literal("select"),
      message: z.string(),
      choices: z.array(
        z.object({
          value: z.string(),
          title: z.string(),
        })
      ),
    })
    .describe("get a choice from the user"),
])

export type AICommandVariable = z.infer<typeof AICommandVariableSchema>

const AICommandSchema = z.object({
  command: z.string().describe("the cli command"),
  example: z.string().optional().describe("example to show in cli help"),
  description: z
    .string()
    .optional()
    .describe("description to show in cli help"),
  variables: z.record(AICommandVariableSchema).optional(),
  prompt: z.string().describe("the prompt to send to the model"),
  require_stdin: z
    .boolean()
    .optional()
    .describe("Require piping output from another program to Terminal AI"),
})

export type AICommand = z.infer<typeof AICommandSchema>

export const ConfigSchema = z.object({
  default_model: z.string().optional(),
  openai_api_key: z
    .string()
    .optional()
    .describe('Default to the "OPENAI_API_KEY" environment variable'),
  openai_api_url: z
    .string()
    .optional()
    .describe('Default to the "OPENAI_API_URL" environment variable'),
  gemini_api_key: z
    .string()
    .optional()
    .describe('Default to the "GEMINI_API_KEY" environment variable'),
  gemini_api_url: z
    .string()
    .optional()
    .describe('Default to the "GEMINI_API_URL" environment variable'),
  anthropic_api_key: z
    .string()
    .optional()
    .describe('Default to the "ANTHROPIC_API_KEY" environment variable'),
  groq_api_key: z
    .string()
    .optional()
    .describe('Default to the "GROQ_API_KEY" environment variable'),
  groq_api_url: z
    .string()
    .optional()
    .describe('Default to the "GROQ_API_URL" environment variable'),
  ollama_host: z
    .string()
    .optional()
    .describe('Default to the "OLLAMA_HOST" environment variable'),
  commands: z.array(AICommandSchema).optional(),
})

export type Config = z.infer<typeof ConfigSchema>

export function loadConfig(): Config {
  const joycon = new JoyCon()

  joycon.addLoader({
    test: /\.toml$/,
    loadSync: (filepath) => {
      const content = fs.readFileSync(filepath, "utf-8")
      return toml.parse(content)
    },
  })

  const globalConfig = joycon.loadSync(
    ["config.json", "config.toml"],
    configDirPath,
    path.dirname(configDirPath)
  ).data as Config | undefined

  const localConfig = joycon.loadSync(
    ["terminal-ai.json", "terminal-ai.toml"],
    process.cwd(),
    path.dirname(process.cwd())
  ).data as Config | undefined

  return {
    ...globalConfig,
    ...localConfig,
    commands: [
      ...(globalConfig?.commands || []),
      ...(localConfig?.commands || []),
    ],
  }
}
