import process from "node:process"
import { CoreMessage, generateText, streamText } from "ai"
import { loadFiles, notEmpty } from "./utils"
import { loadConfig } from "./config"
import {
  MODEL_PREFIXES,
  getAllModels,
  getCheapModelId,
  toProviderModelId,
} from "./models"
import cliPrompts from "prompts"
import { isOutputTTY, stdin } from "./tty"
import { CliError } from "./error"
import { getSDKModel } from "./ai-sdk"
import { debug } from "./debug"
import { fetchUrl } from "./fetch-url"
import { getSearchResult } from "./search"
import logUpdate from "log-update"
import { renderMarkdown } from "./markdown"
import { loadChat, saveChat } from "./chat"
import { getCyberSecurityInfo, formatCyberQuery, isCyberSecurityQuery } from "./cyber"

export async function ask(
  prompt: string | undefined,
  options: {
    model?: string | boolean
    command?: boolean
    pipeInput?: string
    files?: string | string[]
    type?: string
    url?: string | string[]
    search?: boolean
    stream?: boolean
    reply?: boolean
    breakdown?: boolean
    cyber?: boolean
  }
) {
  if (!prompt) {
    throw new CliError("please provide a prompt")
  }

  // Format the prompt for cybersecurity mode if enabled
  const formattedPrompt = options.cyber ? formatCyberQuery(prompt) : prompt;

  const chat = options.reply ? loadChat() : null
  const config = loadConfig()
  let modelId =
    options.model === true
      ? "select"
      : options.model ||
        chat?.options.realModelId ||
        config.default_model ||
        "gpt-4o-mini"

  const models = await getAllModels(
    modelId === "select"
      ? true
      : modelId === "ollama" || modelId.startsWith("ollama-")
      ? "required"
      : false
  )

  if (
    modelId === "select" ||
    modelId === "ollama" ||
    (typeof modelId === "string" && MODEL_PREFIXES.includes(modelId))
  ) {
    if (process.platform === "win32" && !process.stdin.isTTY) {
      throw new CliError(
        "Interactively selecting a model is not supported on Windows when using piped input. Consider directly specifying the model id instead, for example: `-m gpt-4o`"
      )
    }

    const result = await cliPrompts([
      {
        stdin,

        type: "autocomplete",

        message: "Select a model",

        name: "modelId",

        async suggest(input, choices) {
          return choices.filter((choice) => {
            return choice.title.toLowerCase().includes(input)
          })
        },

        choices: models
          .filter(
            (item) => modelId === "select" || item.id.startsWith(`${modelId}-`)
          )
          .map((item) => {
            return {
              value: item.id,
              title: item.id,
            }
          }),
      },
    ])

    if (typeof result.modelId !== "string" || !result.modelId) {
      throw new CliError("no model selected")
    }

    modelId = result.modelId
  }

  debug(`Selected modelID: ${modelId}`)

  const matchedModel = models.find(
    (m) => m.id === modelId || m.realId === modelId
  )
  if (!matchedModel) {
    throw new CliError(
      `model not found: ${modelId}\n\navailable models: ${models
        .map((m) => m.id)
        .join(", ")}`
    )
  }
  const realModelId = matchedModel.realId || modelId
  const model = await getSDKModel(modelId, config)

  debug("model", realModelId)

  const isOpenAIReasoning = /-o\d+/.test(matchedModel.id)
  const isCopilotOpenAIReasoning = /copilot-o\d+/.test(matchedModel.id)
  const isCopilotOpenAIO1 = /copilot-o1/.test(matchedModel.id)

  const files = await loadFiles(options.files || [])
  const remoteContents = await fetchUrl(options.url || [])
  const context = [
    // inhert prev chat
    !chat &&
      isOpenAIReasoning &&
      (isCopilotOpenAIReasoning
        ? // copilot openai doesn't support the special syntax, so this is a workaround
          `Using markdown formatting if necessary`
        : // special syntax to re-enable markdown formatting
          `Formatting re-enabled`),
    !chat && `Context:`,
    !chat &&
      `platform: ${process.platform}\nshell: ${process.env.SHELL || "unknown"}`,

    options.pipeInput && [`stdin:`, "```", options.pipeInput, "```"].join("\n"),

    files.length > 0 && "files:",
    ...files.map((file) => `${file.name}:\n"""\n${file.content}\n"""`),

    remoteContents.length > 0 && "remote contents:",
    ...remoteContents.map(
      (content) => `${content.url}:\n"""\n${content.content}\n"""`
    ),
  ]
    .filter(notEmpty)
    .join("\n")

  let searchResult: string | undefined

  if (options.search) {
    const searchModel = model(getCheapModelId(realModelId))
    // Enhance search with cybersecurity context if cyber mode is enabled
    searchResult = await getSearchResult(searchModel, { 
      context, 
      prompt: options.cyber ? `cybersecurity ${prompt}` : prompt 
    })
  }

  const messages: CoreMessage[] = []

  const prevSystemMessage = chat?.messages[0]
  
  // Get cybersecurity tools and resources for the system prompt
  const cyberInfo = options.cyber ? getCyberSecurityInfo() : null;
  
  // Cybersecurity specialist mode enhancement
  const cyberSystemPrompt = options.cyber 
    ? `You are now in cybersecurity specialist mode. Focus exclusively on providing ethical cybersecurity-related information.
    - Only answer questions related to cybersecurity, penetration testing, security assessment, and defensive techniques
    - Prioritize security best practices and ethical hacking principles
    - If asked about anything not related to cybersecurity, redirect to security topics
    - Format answers with security-focused terminology
    - Provide command examples and code snippets when applicable for security tasks
    - All examples should include appropriate warnings about legal and ethical use
    - For search queries, focus on security resources and documentation

    Cybersecurity Tools Knowledge Base:
    ${cyberInfo?.tools.map(tool => `- ${tool.name}: ${tool.description} (${tool.category})`).join('\n')}
    
    Recommended Security Resources:
    ${cyberInfo?.resources.join(', ')}
    `
    : "";

  messages.push({
    // using system message with copilot openai reasoning models results in Bad Request
    role: isCopilotOpenAIReasoning ? "user" : "system",
    content:
      (prevSystemMessage?.content ? `${prevSystemMessage.content}\n` : "") +
      cyberSystemPrompt +
      [context, searchResult && "search result:", searchResult]
        .filter(notEmpty)
        .join("\n"),
  })

  if (chat) {
    messages.push(...chat.messages.slice(1))
  }

  messages.push({
    role: "user",
    content: [
      formattedPrompt, // Use the formatted prompt
      options.command
        ? `Return the command only without any other text or markdown code fences.${options.cyber ? ' Ensure the command is security-related.' : ''}`
        : ``,
      options.breakdown
        ? `You must return in the following format:\n...command\n\n...command breakdown${options.cyber ? ' with security considerations' : ''}`
        : ``,
      options.type
        ? [
            `The result must match the following type definition:`,
            "```typescript",
            options.type,
            "```",
            "Return the result only without any other text or markdown code fences.",
          ].join("\n")
        : ``,
    ]
      .filter(notEmpty)
      .join("\n"),
  })

  debug("messages", messages)

  if (isOutputTTY) {
    logUpdate(`Waiting for ${realModelId} to respond...`)
  }

  const temperature = 0
  const providerModelId = toProviderModelId(realModelId)

  // Copilot O1 doesn't support streaming yet
  if (options.stream === false || isCopilotOpenAIO1) {
    const result = await generateText({
      model: model(providerModelId),
      messages,
      temperature,
    })

    logUpdate.clear()
    logUpdate(renderMarkdown(result.text).trim())
    logUpdate.done()
    process.exit()
  }

  const { textStream } = streamText({
    model: model(providerModelId),
    messages,
    temperature,
  })

  logUpdate.clear()

  let output = ""
  for await (const textPart of textStream) {
    output += textPart
    process.stdout.write(textPart)
  }
  process.stdout.write("\n")

  saveChat({
    messages: [...messages, { role: "assistant", content: output }],
    options: { realModelId, temperature },
  })

  logUpdate.done()
  process.exit()
}
