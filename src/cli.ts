#!/usr/bin/env node
import process from "node:process"
import { cac, Command as CliCommand } from "cac"
import { bold, green, underline } from "colorette"
import { getAllModels } from "./models"
import updateNotifier from "update-notifier"
import { ask } from "./ask"
import { getAllCommands, getPrompt } from "./ai-command"
import { readPipeInput } from "./tty"
import { CliError } from "./error"
import { loadConfig } from "./config"
import { copilot } from "./copilot"
import { APICallError } from "ai"
import { Agent } from "./agent"
import { createProject, listProjects, getProjectInfo, setActiveProject, getActiveProject, clearActiveProject, readHistory, importTranscript, projectExists } from "./project"
import { spawn, spawnSync } from "child_process"
import path from "path"
import os from "os"
import { randomUUID } from "crypto"
import { existsSync } from "fs"

if (typeof PKG_NAME === "string" && typeof PKG_VERSION === "string") {
  updateNotifier({
    pkg: { name: PKG_NAME, version: PKG_VERSION },
    shouldNotifyInNpmScript: false,
  }).notify({
    isGlobal: true,
  })
}

function applyCommonFlags(command: CliCommand) {
  command.option("-c, --command", "Get AI to return a command only")
  command.option(
    "-b, --breakdown",
    "Get AI to return a command and the breakdown of this command"
  )
  command.option(
    "-m, --model [model]",
    "Choose the AI model to use, omit value to select interactively"
  )
  command.option("--files <pattern>", "Add files to model context")
  command.option(
    "-t, --type <type>",
    "Define the shape of the response in TypeScript"
  )
  command.option("-u,--url <url>", "Fetch URL content as context")
  command.option("-s, --search", "Enable web search")
  command.option("--no-stream", "Disable streaming output")
  command.option("-r, --reply", "Reply to previous conversation")
  command.option("--cyber", "Activate cybersecurity specialist mode")
  command.option("-p, --project <name>", "Specify a project to log this session")
  return command
}

async function main() {
  const cli = cac("hoi")
  const config = loadConfig()

  const root = cli.command("[...prompt]", "Run the prompt")

  applyCommonFlags(root)

  root.action(async (prompt, flags) => {
    const pipeInput = await readPipeInput()
    const project = flags.project || getActiveProject()
    await ask(prompt.join(" "), { ...flags, project, pipeInput })
  })

  cli
    .command("cyber [...prompt]", "Run in cybersecurity specialist mode")
    .option("-c, --command", "Get AI to return a security command only")
    .option(
      "-b, --breakdown",
      "Get AI to return a security command and the breakdown"
    )
    .option(
      "-m, --model [model]",
      "Choose the AI model to use, omit value to select interactively"
    )
    .option("--files <pattern>", "Add files to model context")
    .option("-u,--url <url>", "Fetch URL content as context")
    .option("-s, --search", "Enable web search focused on security resources")
    .option("--no-stream", "Disable streaming output")
    .option("-r, --reply", "Reply to previous conversation")
    .action(async (prompt, flags) => {
      const pipeInput = await readPipeInput()
      const project = flags.project || getActiveProject()
      await ask(prompt.join(" "), { 
        ...flags, 
        pipeInput,
        cyber: true,
        project,
      })
    })

  cli
    .command("agent <goal>", "Run an agent-based workflow")
    .option("--verbose", "Enable verbose output")
    .option("--max-steps <steps>", "Maximum number of steps", {
      default: 5,
    })
    .action(async (goal, flags) => {
      const agent = new Agent(config, {
        maxSteps: Number(flags.maxSteps),
        verbose: flags.verbose,
      })
      
      const result = await agent.run(goal)
      
      if (result.success) {
        console.log(result.message)
        if (result.data && flags.verbose) {
          console.log("Steps:", JSON.stringify(result.data.steps, null, 2))
        }
      } else {
        console.error(result.message)
        process.exitCode = 1
      }
    })

  cli
    .command("list", "List available models")
    .alias("ls")
    .action(async () => {
      const models = await getAllModels(true)

      for (const model of models) {
        console.log(model.id)
      }
    })

  cli.command("copilot-login").action(async () => {
    const deviceCodeResult = await copilot.requestDeviceCode()

    console.log("First copy your one-time code:\n")
    console.log(bold(green(deviceCodeResult.user_code)))
    console.log()
    console.log(
      "Then visit this GitHub URL to authorize:",
      underline(deviceCodeResult.verification_uri)
    )

    console.log()
    console.log("Waiting for authentication...")
    console.log(`Press ${bold("Enter")} to check the authentication status...`)

    const checkAuth = async () => {
      const authResult = await copilot
        .verifyAuth(deviceCodeResult)
        .catch(() => null)
      if (authResult) {
        console.log("Authentication successful!")
        copilot.saveAuthToken(authResult.access_token)
        process.exit(0)
      } else {
        console.log("Authentication failed. Please try again.")
      }
    }

    // press Enter key to check auth
    process.stdin.on("data", (data) => {
      const str = data.toString()
      if (str === "\n" || str === "\r\n") {
        checkAuth()
      }
    })
  })

  cli.command("copilot-logout").action(() => {
    copilot.removeAuthToken()
    console.log("Copilot auth token removed")
  })

  cli
    .command("project:init <name> [description]", "Create a new project")
    .action((name, description) => {
      createProject(name, description)
      console.log(`Project '${name}' created`)
    })

  cli
    .command("project:list", "List projects")
    .action(() => {
      const projects = listProjects()
      projects.forEach((p) => {
        console.log(`${p.name}  \t${p.description ?? ""}`)
      })
    })

  cli
    .command("project:info <name>", "Show project info")
    .action((name) => {
      const info = getProjectInfo(name)
      if (!info) {
        console.error("Project not found")
        process.exit(1)
      }
      console.log(JSON.stringify(info, null, 2))
    })

  // command to activate project
  cli.command("project:use <name>", "Set active project").action((name) => {
    setActiveProject(name)
    console.log(`Active project set to '${name}'`)
  })
  cli.command("project:current", "Show active project").action(() => {
    const current = getActiveProject()
    console.log(current ? current : "(none)")
  })
  cli.command("project:clear", "Clear active project").action(() => {
    clearActiveProject()
    console.log("Active project cleared")
  })

  cli.command("project:history <name>")
    .option("--json", "Show JSON instead of markdown")
    .action((name, flags) => {
      try {
        const content = readHistory(name, flags.json ? "json" : "md")
        console.log(content)
      } catch (e) {
        console.error((e as Error).message)
        process.exit(1)
      }
    })

  cli.command("project:logfile <name> <file>", "Import a shell transcript")
    .action((name, file) => {
      try {
        importTranscript(name, file)
        console.log("Transcript imported.")
      } catch (e) {
        console.error((e as Error).message)
        process.exit(1)
      }
    })

  cli.command("project:shell <name> [description]", "Create (if needed) & activate a project, then open tracked subshell")
    .action((name, description) => {
      // create if missing
      if (!projectExists(name)) {
        createProject(name, description)
      }
      // set active
      setActiveProject(name)
      if (process.platform === "win32") {
        const sysRoot = process.env.SystemRoot || "C:/Windows"
        const absCandidates = [
          path.join(sysRoot, "System32/WindowsPowerShell/v1.0/powershell.exe"),
          path.join(sysRoot, "System32/WindowsPowerShell/v1.0/powershell"),
          path.join(sysRoot, "System32/WindowsPowerShell/v1.0/pwsh.exe"),
          path.join(process.env["ProgramFiles"] || "C:/Program Files", "PowerShell/7/pwsh.exe"),
        ]
        const psExeCandidates = [
          ...absCandidates,
          "powershell.exe",
          "powershell",
          "pwsh.exe",
          "pwsh",
        ]
        const psExe = psExeCandidates.find((cmd) => {
          if (path.isAbsolute(cmd) && existsSync(cmd)) return true
          const res = spawnSync(cmd, ["-NoLogo", "-Command", "exit"], { stdio: "ignore", shell: true })
          return res.error ? false : true
        })
        if (!psExe) {
          console.error("PowerShell executable not found. Install PowerShell or use project:logfile to import a transcript manually.")
          process.exit(1)
        }

        const transcriptFile = path.join(os.tmpdir(), `${randomUUID()}.txt`)
        const ps = spawn(psExe, [
          "-NoLogo",
          "-NoExit",
          "-Command",
          `Start-Transcript -Path '${transcriptFile}'; Write-Host 'Recording commands for project ${name}. Exit shell to finish.'`
        ], { stdio: "inherit" })
        ps.on("exit", () => {
          spawn(psExe, ["-Command", `try { Stop-Transcript } catch {}`], { stdio: "ignore" }).on("exit", () => {
            importTranscript(name, transcriptFile)
            console.log("Imported transcript.")
          })
        })
      } else {
        // use script command
        const tmp = path.join(os.tmpdir(), `${randomUUID()}.ttyrec`)
        const sh = process.env.SHELL || "/bin/bash"
        const rec = spawn("script", ["-q", "-c", sh, tmp], { stdio: "inherit" })
        rec.on("exit", () => {
          importTranscript(name, tmp)
          console.log("Imported transcript.")
        })
      }
    })

  const allCommands = getAllCommands(config)
  for (const command of allCommands) {
    const c = cli.command(command.command, command.description)

    applyCommonFlags(c)

    if (command.example) {
      c.example(command.example)
    }

    if (command.variables) {
      for (const variableName in command.variables) {
        const value = command.variables[variableName]
        if (typeof value === "string") continue

        c.option(`--${variableName} <${variableName}>`, value.message)
      }
    }

    c.action(async (flags) => {
      const {
        model,
        files,
        type,
        url,
        search,
        stream,
        reply,
        breakdown,
        cyber,
        project: projectFlag,
        ...localFlags
      } = flags
      const project = projectFlag || getActiveProject()
      const pipeInput = await readPipeInput()

      if (command.require_stdin && !pipeInput) {
        throw new CliError(
          `this command requires piping input from another program to Terminal AI, e.g. \`echo 'input' | hoi ${command.command}\``
        )
      }

      const prompt = await getPrompt(
        command.prompt,
        command.variables,
        localFlags
      )
      await ask(prompt, {
        model,
        pipeInput,
        files,
        type,
        url,
        search,
        stream,
        reply,
        breakdown,
        cyber,
        project,
      })
    })
  }

  cli.version(typeof PKG_VERSION === "string" ? PKG_VERSION : "0.0.0")
  cli.help()

  try {
    cli.parse(process.argv, { run: false })
    await cli.runMatchedCommand()
  } catch (error) {
    process.exitCode = 1
    if (error instanceof CliError) {
      console.error(error.message)
    } else if (error instanceof APICallError) {
      console.log(error.responseBody)
    } else {
      throw error
    }
  }
}

main()