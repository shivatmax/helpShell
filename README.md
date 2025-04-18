# terminal-ai

A powerful command-line AI assistant that enhances your terminal experience.

![terminal-ai screenshot coming soon]()

## Installation

Requires Node.js:

```bash
npm i -g terminal-ai
```

## Features

- Interact with AI models directly from your terminal
- Get command suggestions
- Analyze code and files
- Web search capabilities
- Content summarization
- Custom AI commands
- Cybersecurity specialist mode

## Supported AI Models

- OpenAI models (GPT-4, GPT-3.5)
- Anthropic Claude models
- Local models via Ollama
- Google Gemini
- Groq models

## Configuration

Create a `~/.config/terminal-ai/config.json` file:

```json
{
  "openai_api_key": "your-api-key-here"
}
```

See [configuration guide](./docs/config.md) for more options.

## Usage

Basic usage:

```bash
# Ask a question
hoi "how to optimize docker image size"

# Get command suggestions
hoi "find all large files in current directory" -c

# Use file context
cat complex-code.js | hoi "explain this code"

# Web search
hoi -s "latest Node.js features"
```

## Cybersecurity Mode

Access cybersecurity expertise with our dedicated security mode:

```bash
# Use the cyber command for security questions
hoi cyber "how to scan for open ports"

# Get security-focused command suggestions
hoi cyber "detect vulnerabilities in a web app" -c

# Get detailed breakdowns of security commands
hoi cyber "set up a firewall" -b

# Analyze security-related files
cat suspicious.log | hoi cyber "analyze this log for security issues"

# Enable cybersecurity mode with the flag for any command
hoi "find malicious processes" --cyber
```

The cybersecurity mode provides:
- Security-focused responses
- Ethical hacking guidance
- Knowledge of common security tools
- Best practices for security testing
- Command examples with security context
- References to security resources

## Custom Commands

Define your own AI-powered commands in your config:

```json
{
  "commands": [
    {
      "command": "explain",
      "description": "Explain code in simple terms",
      "prompt": "Explain the following code in simple terms, highlighting important patterns:"
    }
  ]
}
```

Then use it:

```bash
cat complex-algorithm.js | hoi explain
```

## License

MIT
