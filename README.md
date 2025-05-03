# Helpshell

A powerful command-line AI assistant that enhances your terminal experience.

![Helpshell in action](screenshots/helpshell-demo.png)

## Quick Demo

Check out our [step-by-step demo](./demo.md) showing how Helpshell can help in real-world development scenarios.

## Installation

Requires Node.js:

```bash
npm i -g Helpshell
```

## Features

- Interact with AI models directly from your terminal
- Get command suggestions
- Analyze code and files
- Web search capabilities
- Content summarization
- Custom AI commands
- Cybersecurity specialist mode
- Vector database for local document search

## Supported AI Models

- OpenAI models (GPT-4, GPT-3.5)
- Anthropic Claude models
- Local models via Ollama
- Google Gemini
- Groq models

## Configuration

Create a `~/.config/Helpshell/config.json` file:

```json
{
  "openai_api_key": "your-api-key-here",
  "gemini_api_key": "your-gemini-api-key-here"
}
```

See [configuration guide](./docs/config.md) for more options.

## Usage

Basic usage:

```bash
# hoi a question
hoi "how to optimize docker image size"

# Get command suggestions
hoi "find all large files in current directory" -c

# Use file context
cat complex-code.js | hoi "explain this code"

# Web search
hoi -s "latest Node.js features"

#If you want to add multiple files, especially when you also want to include filenames in the context, you can use --files flag to add files into model context:

hoi --files "src/*.ts " "write a concise outline for this project" 

#hoi Follow-up Questions
hoi "how to delete a docker image"

hoi -r "delete last 30 days"
# Result Types

## Command Type
hoi "turn foo.mp4 to 720p using ffmpeg" -c

##using -b or --breakdown flag to return a command and the breakdown of the command:
hoi "turn foo.mp4 to 720p using ffmpeg" -b

Custom Type

cat package.json | ask "extract dependency names" -t "string[]"

cat README.md | ask "extract headings" -t "{depth:number,title:string}[]"
```

## Vector Database Search

Helpshell includes a built-in vector database for local document search that enables you to:
1. Index and search through documentation websites
2. Create multiple collections of different documentation sets
3. Use the indexed content as context for AI responses

### Indexing Documentation

You can add documentation from websites to your local vector database:

```bash
# Basic indexing of a documentation site
hoi --add-docs https://docs.nestjs.com/ --name-docs nestjs

# Crawl and index multiple pages from the same domain
hoi --add-docs https://docs.nestjs.com/ --name-docs nestjs --crawl

# Limit the number of pages to crawl
hoi --add-docs https://docs.nestjs.com/ --name-docs nestjs --crawl --max-pages 20
```

The crawler uses Puppeteer to render JavaScript-heavy sites and extract clean, structured content. All indexed content is stored in `~/.config/Helpshell/vector-db/` both as vector embeddings and raw text files.

### Using Vector Search in Queries

Once you've indexed documentation, you can use it as context when hoiing questions:

```bash
# hoi about something in the indexed NestJS docs
hoi --read-docs nestjs "How do I implement a controller?"

# Combine with other features
hoi --read-docs nestjs "How do I implement authentication?" --search
```

When using `--read-docs`, Helpshell will:
1. Search the vector database for relevant sections from documentation
2. Inject the most relevant content into the context window
3. Generate a response that directly references the documentation

This feature is particularly useful for framework-specific questions, API documentation, or any reference material you frequently use.

### Technical Details

* Embeddings: Uses Google's `text-embedding-004` model
* Storage: Simple JSONL files for portability
* Full text: Plain text copies of each document are also saved
* Crawling: Uses Puppeteer for full JavaScript rendering 

You need a Google Gemini API key for the embeddings functionality.

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

## Project mode & full‑shell tracking

Terminal‑AI can organise everything you do into "projects" – a self‑contained folder that stores
Markdown + JSON logs.  You can even capture **all** commands ( `cd`, `ls`, `git`… ) via a tracked subshell.

### Quick start
```bash
# 1) create + jump into tracked subshell (auto‑creates project if missing)
hoi project:shell myproj "Experiment with Volatility"
# … do anything you like inside; when finished type `exit`
# ← transcript is imported and logged.

# 2) View or download logs
hoi project:history myproj            # markdown
hoi project:history myproj --json     # structured JSON

# 3) Other project commands
hoi project:list                      # list projects
hoi project:info <n>                  # show metadata
hoi project:use  <n>                  # set active project (no need for -p flag)
hoi project:current                   # print the active project
hoi project:clear                     # deactivate current project

# Import an existing transcript manually
hoi project:logfile <n> <path-to-file>
```

### What gets stored?
A project folder lives in `~/.hoi-projects/<n>/` and contains:

| file              | purpose                                |
|-------------------|-----------------------------------------|
| `project.json`    | metadata (name, description, timestamps) |
| `history.md`      | human‑readable chronological log         |
| `history.json`    | array of `{timestamp,prompt/output}`     |

### Passive logging with `-p | --project`
If you don't need full transcript capture you can simply attach prompts to a project:

```bash
hoi -p myproj "how to crack a zip password?"   # only this prompt/output logged
```

See the docs above for the rest of Terminal‑AI's capabilities.

## Demo Screenshots

Here are some examples of Helpshell in action:

### Command Generation
![Command generation](screenshots/command-generation.png)

### Code Analysis
![Code analysis](screenshots/code-analysis.png)

### Project Tracking
![Project tracking](screenshots/project-tracking.png)

For more detailed examples with step-by-step instructions, see our [demo guide](./demo.md).

## License

MIT
