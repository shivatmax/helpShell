# Helpshell Demo: A Day in the Life

This demo walks through common use cases for Helpshell through the story of Alex, a developer working on various tasks throughout their day.

## Setup

Before starting, ensure you have Helpshell installed:

```bash
git clone https://github.com/shivatmax/helpShell.git
pnpm install
npm link
```

## Use Case 1: Command Generation

**Scenario**: Alex needs to find large files taking up disk space

```bash
# Alex asks for help finding large files
hoi "find all files larger than 100MB in my home directory" -c
```


**Expected output**: Helpshell suggests the command
 `Get-ChildItem -Path ~ -Recurse -File | Where-Object {$_.Length -gt 100MB} | Select-Object -ExpandProperty FullName` 

## Use Case 2: Code Explanation

**Scenario**: Alex encounters unfamiliar code in a project
```bash
cd C:\Users\awast\OneDrive\Documents\m0\voice\shell-ask
```

```bash
# Alex pipes code into Helpshell for explanation
cat README.md | hoi "explain this project readme"
```


**Expected output**: Helpshell provides a breakdown of the component's structure, state management, props, and side effects.

## Use Case 3: Project Mode Tracking

**Scenario**: Step-by-Step Nmap Investigation Commands

```bash
# Alex creates a new project and starts tracked shell
hoi project:shell nmap101 "investigating local network hosts and use nmap to investigate other IP addresses"

# Inside the tracked shell, Alex runs various commands:
ipconfig | hoi "my IP and subnet"
hoi -r "nmap command to discover Live Hosts on the Local Network"
nmap -sn 192.168.0.1/24
hoi "nmap for Getting Host Details"
nmap -O -sS -v 192.168.1.X
# After completing work, Alex exits the shell
exit
hoi project:history nmap101
hoi project:history nmap101 --json
```

**Expected output**: All commands and their outputs are recorded in the project history.

## Use Case 4: Vector Search Documentation

**Scenario**: Alex needs help with NestJS framework

```bash
# First, Alex indexes the NestJS documentation
hoi --add-docs https://docs.nestjs.com/ --name-docs nestjs --crawl --max-pages 30

# Later, Alex uses this knowledge to get accurate framework-specific help
hoi --read-docs nestjs "How do I implement a custom guard in NestJS?"
```

**Expected output**: Helpshell provides NestJS-specific guidance based on the indexed documentation.

## Use Case 5: Cybersecurity Mode

**Scenario**: Alex needs to audit a server's security

```bash
# Alex uses cybersecurity mode to get specialized security advice
hoi cyber "how to scan for open ports and security vulnerabilities" -c
```

**Expected output**: Helpshell suggests secure scanning methods with nmap, explaining security implications.

## Use Case 6: Custom Commands

**Scenario**: Alex frequently needs to document code

After configuring a custom command in `~/.config/helpshell/config.json`:

```json
{
  "commands": [
    {
      "command": "docstring",
      "description": "Generate comprehensive documentation for code",
      "prompt": "Create detailed JSDoc comments for the following code:"
    }
  ]
}
```

Alex uses it:

```bash
cat src/auth/authGuard.ts | hoi docstring
```

**Expected output**: Helpshell generates well-formatted JSDoc comments for the TypeScript file.

## Advanced Use Cases

Beyond these examples, Helpshell excels at:

- Troubleshooting error messages (pipe errors directly to Helpshell)
- Generating complex data processing pipelines
- Providing contextual API documentation
- Converting between different command formats
- Analyzing log files for patterns

To explore these advanced use cases, try:

```bash
# Error troubleshooting
npm run build 2>&1 | hoi "why is this failing?"

# Log analysis
cat /var/log/nginx/access.log | hoi "find suspicious access patterns"

# API documentation
hoi "how do I use the fs.promises API in Node.js?"
```

For more examples and detailed documentation, visit our [official documentation](https://docs.helpshell.dev).
