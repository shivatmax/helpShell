import { marked } from "marked"
import { markedTerminal } from "marked-terminal"
import { bold, magenta, cyan, yellow, green, underline } from "colorette"

// Configure colourful theme
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
marked.use((markedTerminal as any)({
  // Use a custom theme for different markdown elements
  theme: {
    heading: (text: string) => bold(magenta(text)),
    firstHeading: (text: string) => bold(underline(magenta(text))),
    secondHeading: (text: string) => bold(magenta(text)),
    thirdHeading: (text: string) => magenta(text),
    code: (code: string) => cyan(code),
    blockquote: (text: string) => yellow(text),
    table: {
      header: (cell: string) => bold(green(cell)),
      body: (cell: string) => green(cell),
    },
    link: (href: string) => underline(cyan(href)),
    hr: () => magenta("―".repeat(process.stdout.columns || 10)),
  },
}))

export function renderMarkdown(input: string) {
  return marked.parse(input) as string
}
