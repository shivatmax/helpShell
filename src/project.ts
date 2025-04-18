import fs from "fs"
import os from "os"
import path from "path"

export type ProjectInfo = {
  name: string
  description?: string
  createdAt: string
}

const PROJECTS_ROOT = path.join(os.homedir(), ".hoi-projects")
const ACTIVE_FILE = path.join(PROJECTS_ROOT, ".active")

function ensureProjectsRoot() {
  if (!fs.existsSync(PROJECTS_ROOT)) {
    fs.mkdirSync(PROJECTS_ROOT, { recursive: true })
  }
}

function getProjectPath(name: string) {
  ensureProjectsRoot()
  return path.join(PROJECTS_ROOT, name)
}

export function createProject(name: string, description?: string) {
  const projectPath = getProjectPath(name)
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true })
    const info: ProjectInfo = {
      name,
      description,
      createdAt: new Date().toISOString(),
    }
    fs.writeFileSync(path.join(projectPath, "project.json"), JSON.stringify(info, null, 2))
  }
}

export function projectExists(name: string) {
  return fs.existsSync(path.join(getProjectPath(name), "project.json"))
}

export function setActiveProject(name: string) {
  if (!projectExists(name)) {
    throw new Error(`Project not found: ${name}`)
  }
  fs.writeFileSync(ACTIVE_FILE, name, "utf-8")
}

export function clearActiveProject() {
  if (fs.existsSync(ACTIVE_FILE)) fs.unlinkSync(ACTIVE_FILE)
}

export function getActiveProject(): string | null {
  if (!fs.existsSync(ACTIVE_FILE)) return null
  return fs.readFileSync(ACTIVE_FILE, "utf-8").trim() || null
}

// Structured JSON logging path helper
function getJsonLogPath(projectName: string) {
  return path.join(getProjectPath(projectName), "history.json")
}

export function logCommand(
  projectName: string,
  prompt: string,
  output: string
) {
  if (!projectExists(projectName)) {
    // Auto create the project if it doesn't exist
    createProject(projectName)
  }

  const projectPath = getProjectPath(projectName)
  const logPathMd = path.join(projectPath, "history.md")
  const logPathJson = getJsonLogPath(projectName)
  const now = new Date()
  const entry = {
    timestamp: now.toISOString(),
    prompt: prompt.trim(),
    output: output.trim(),
  }

  // markdown append
  const md = [
    `## ${entry.timestamp}`,
    "",
    "### Prompt",
    "```",
    entry.prompt,
    "```",
    "",
    "### Output",
    "```",
    entry.output,
    "```",
    "",
  ].join("\n")
  fs.appendFileSync(logPathMd, md)

  // json append list
  const list: typeof entry[] = fs.existsSync(logPathJson)
    ? JSON.parse(fs.readFileSync(logPathJson, "utf-8"))
    : []
  list.push(entry)
  fs.writeFileSync(logPathJson, JSON.stringify(list, null, 2))
}

export function getProjectInfo(name: string): ProjectInfo | null {
  const infoPath = path.join(getProjectPath(name), "project.json")
  if (!fs.existsSync(infoPath)) return null
  try {
    return JSON.parse(fs.readFileSync(infoPath, "utf-8")) as ProjectInfo
  } catch {
    return null
  }
}

export function listProjects(): ProjectInfo[] {
  ensureProjectsRoot()
  const dirs = fs.readdirSync(PROJECTS_ROOT).filter((d) => {
    return fs.existsSync(path.join(PROJECTS_ROOT, d, "project.json"))
  })
  return dirs
    .map((d) => getProjectInfo(d))
    .filter((p): p is ProjectInfo => Boolean(p))
}

export function readHistory(name: string, format: "md" | "json" = "md") {
  if (!projectExists(name)) throw new Error("Project not found")
  const filePath = format === "md" ? path.join(getProjectPath(name), "history.md") : getJsonLogPath(name)
  if (!fs.existsSync(filePath)) return ""
  return fs.readFileSync(filePath, "utf-8")
}

export function importTranscript(projectName: string, transcriptPath: string) {
  if (!fs.existsSync(transcriptPath)) {
    throw new Error(`Transcript not found: ${transcriptPath}`)
  }
  const raw = fs.readFileSync(transcriptPath, "utf-8")
  // Split into blocks where each command line starts with "$ " (POSIX) or "> " (PowerShell)
  const lines = raw.split(/\r?\n/)
  let currentCmd: string | null = null
  let buffer: string[] = []
  const flush = () => {
    if (currentCmd !== null) {
      logCommand(projectName, currentCmd, buffer.join("\n"))
    }
  }
  for (const line of lines) {
    if (/^[$>] /.test(line) || /^[A-Za-z]:.*> /.test(line) || /^PS [^>]+> /.test(line)) {
      // new command encountered
      flush()
      currentCmd = line.replace(/^[$>] /, "").replace(/^PS [^>]+> /, "").replace(/^[A-Za-z]:.*> /, "").trim()
      buffer = []
    } else {
      buffer.push(line)
    }
  }
  // flush last
  flush()
} 