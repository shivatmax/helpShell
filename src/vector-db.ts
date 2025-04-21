import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "crypto"
import { embedMany, embed } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { loadConfig, configDirPath } from "./config"
import { fetchUrl } from "./fetch-url"
import { load as loadCheerio } from "cheerio"
import puppeteer from "puppeteer"

export interface VectorDocEntry {
  id: string
  source: string // original URL or file path
  text: string
  embedding: number[]
}

// Path: ~/.config/terminal-ai/vector-db
const VECTOR_DB_DIR = path.join(configDirPath, "vector-db")

function ensureDir() {
  fs.mkdirSync(VECTOR_DB_DIR, { recursive: true })
}

function getCollectionPath(name: string) {
  ensureDir()
  return path.join(VECTOR_DB_DIR, `${name}.jsonl`)
}

function extractText(html: string) {
  const $ = loadCheerio(html)
  
  // Remove non-content elements
  $("script,style,noscript,svg,meta,link,iframe,nav,footer,header").remove()
  
  // Remove common non-content classes
  $('[class*="nav"],[class*="menu"],[class*="footer"],[class*="header"],[class*="banner"],[class*="ad"],[id*="menu"],[id*="nav"]').remove()
  
  // Focus on content areas first if they exist
  const mainContent = $('main, article, .content, .article, .post, [role="main"], #content, #main, .documentation, .docs-content');
  
  let text = ''
  if (mainContent.length > 0) {
    // Extract from identified content areas
    mainContent.each((_, element) => {
      $(element).find('h1, h2, h3, h4, h5, h6, p, li, td, th, pre, code, blockquote').each((_, el) => {
        const elementText = $(el).text().trim()
        if (elementText) {
          text += elementText + '\n\n'
        }
      })
    })
  } else {
    // Fallback to all content in body
    $('body').find('h1, h2, h3, h4, h5, h6, p, li, td, th, pre, code, blockquote').each((_, el) => {
      const elementText = $(el).text().trim()
      if (elementText) {
        text += elementText + '\n\n'
      }
    })
  }
  
  // Clean up the text
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

function chunkText(text: string, maxChars = 4000): string[] {
  if (text.length <= maxChars) return [text]
  const parts: string[] = []
  let start = 0
  while (start < text.length) {
    parts.push(text.slice(start, start + maxChars))
    start += maxChars
  }
  return parts
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

async function crawlWebsite(startUrl: string, maxPages = 30): Promise<{url: string, content: string}[]> {
  const visited = new Set<string>()
  const queue: string[] = [startUrl]
  const results: {url: string; content: string}[] = []
  const origin = new URL(startUrl).origin

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift()!
    if (visited.has(url)) continue
    visited.add(url)
    console.log(`Crawling: ${url} (${results.length + 1}/${maxPages})`)

    try {
      const res = await fetch(url)
      if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) continue
      const html = await res.text()
      results.push({ url, content: html })

      // extract links
      const $ = loadCheerio(html)
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href")
        if (!href) return
        // ignore mailto, hash, etc.
        if (href.startsWith("#") || href.startsWith("mailto:")) return

        let absolute: string
        try {
          absolute = new URL(href, url).toString()
        } catch {
          return
        }
        if (absolute.startsWith(origin) && !visited.has(absolute)) {
          queue.push(absolute)
        }
      })
    } catch {
      // ignore fetch errors
    }
  }

  return results
}

async function crawlWebsitePuppeteer(startUrl: string, maxPages = 30): Promise<{url: string, content: string}[]> {
  const visited = new Set<string>()
  const queue: string[] = [startUrl]
  const results: {url: string; content: string}[] = []
  const origin = new URL(startUrl).origin
  
  // Launch puppeteer browser
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']  
  })
  
  try {
    const page = await browser.newPage()
    
    // Set viewport to desktop size
    await page.setViewport({ width: 1280, height: 800 })
    
    while (queue.length > 0 && results.length < maxPages) {
      const url = queue.shift()!
      if (visited.has(url)) continue
      visited.add(url)
      
      console.log(`Crawling with Puppeteer: ${url} (${results.length + 1}/${maxPages})`)
      
      try {
        // Navigate to page with timeout
        await page.goto(url, { 
          waitUntil: "networkidle2",
          timeout: 30000 
        })
        
        // Wait for content to fully render (this is crucial for JS-heavy sites)
        // Using setTimeout with a promise as a workaround for waitForTimeout
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Get the HTML content after JavaScript execution
        const html = await page.content()
        
        // Use Cheerio to extract text from the rendered HTML
        const $ = loadCheerio(html)
        
        // Remove non-content elements
        $('script, style, noscript, iframe, nav, footer, header').remove()
        $('[class*="nav"],[class*="menu"],[class*="footer"],[class*="header"],[class*="banner"],[class*="ad"]').remove()
        
        // Extract text from main content area if it exists
        let mainContent = $('main, article, .content, .article, .post, [role="main"], #content, #main, .documentation, .docs-content')
        
        let text = ''
        if (mainContent.length > 0) {
          mainContent.find('h1, h2, h3, h4, h5, h6, p, li, pre, code, td, th').each((_, el) => {
            const elementText = $(el).text().trim()
            if (elementText) {
              text += elementText + '\n\n'
            }
          })
        } else {
          // Fallback: extract text from all potential content elements
          $('body').find('h1, h2, h3, h4, h5, h6, p, li, pre, code, td, th').each((_, el) => {
            const elementText = $(el).text().trim()
            if (elementText) {
              text += elementText + '\n\n'
            }
          })
        }
        
        // For very JS-heavy sites, sometimes need to get text directly
        if (!text.trim()) {
          text = await page.evaluate(() => {
            return document.body.innerText || ''
          })
        }
        
        console.log(`Raw extracted length: ${text.length} characters`)
        
        // Clean content
        const cleanedContent = text
          .replace(/\s+/g, ' ')
          .trim()
        
        console.log(`After cleaning: ${cleanedContent.length} characters`)
        
        results.push({ url, content: cleanedContent })
        
        // Extract links from the page
        const links = await page.evaluate((pageOrigin: string) => {
          const linkElements = Array.from(document.querySelectorAll('a[href]'))
          return linkElements
            .map(el => el.getAttribute('href'))
            .filter(href => {
              if (!href) return false
              if (href.startsWith('#') || href.startsWith('mailto:')) return false
              
              try {
                const fullUrl = new URL(href, window.location.href)
                return fullUrl.origin === pageOrigin
              } catch {
                return false
              }
            })
            .map((href): string | null => {
              try {
                return new URL(href || '', window.location.href).toString()
              } catch {
                return null
              }
            })
            // This assertion is safe because we filter out null values before returning
            .filter(Boolean) as string[]
        }, origin)
        
        // Add new links to queue
        for (const link of links) {
          if (!visited.has(link)) {
            queue.push(link)
          }
        }
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(`Error processing ${url}:`, errorMessage)
      }
    }
  } finally {
    await browser.close()
  }
  
  return results
}

export class VectorDB {
  private embedModel: any

  constructor() {
    const config = loadConfig()
    const apiKey = config.gemini_api_key || process.env.GEMINI_API_KEY
    const baseURL =
      config.gemini_api_url || process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/"
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required for embeddings")
    }
    const provider = createGoogleGenerativeAI({ apiKey, baseURL })
    this.embedModel = provider.textEmbeddingModel("text-embedding-004")
  }

  private async writeEntries(collection: string, entries: VectorDocEntry[]) {
    const p = getCollectionPath(collection)
    const handle = fs.createWriteStream(p, { flags: "a" })
    for (const entry of entries) {
      handle.write(JSON.stringify(entry) + "\n")
    }
    handle.end()
  }

  async addDocs(
    collection: string,
    sources: string | string[],
    options?: { crawl?: boolean; maxPages?: number }
  ) {
    const urls = Array.isArray(sources) ? sources : [sources]
    let fetched: { url: string; content: string }[] = []

    const collectionDir = path.join(VECTOR_DB_DIR, collection)
    fs.mkdirSync(collectionDir, { recursive: true })

    if (options?.crawl && urls.length === 1) {
      try {
        fetched = await crawlWebsitePuppeteer(urls[0], options.maxPages || 30)
      } catch (error) {
        console.error('Puppeteer crawl failed, falling back to basic crawler:', error)
        fetched = await crawlWebsite(urls[0], options.maxPages || 30)
      }
    } else {
      fetched = await fetchUrl(urls)
    }

    // Don't re-extract with Cheerio if puppeteer already provided clean content
    let texts: { text: string; source: string }[] = [];
    
    if (options?.crawl && fetched.length > 0 && fetched[0].content.length > 0) {
      // We already have clean text from puppeteer
      for (const item of fetched) {
        console.log(`Using ${item.content.length} characters from puppeteer extraction for ${item.url}`)
        texts.push({ text: item.content, source: item.url });
        try {
          const filename = encodeURIComponent(item.url) + ".txt"
          fs.writeFileSync(path.join(collectionDir, filename), item.content)
        } catch {}
      }
    } else {
      // Using regular fetchUrl or cheerio extraction as fallback
      for (const item of fetched) {
        console.log(`Processing content from: ${item.url}`)
        const cleaned = extractText(item.content)
        console.log(`Extracted ${cleaned.length} characters of text`)
        try {
          const filename = encodeURIComponent(item.url) + ".txt"
          fs.writeFileSync(path.join(collectionDir, filename), cleaned)
        } catch {}

        const chunks = chunkText(cleaned)
        for (const chunk of chunks) {
          texts.push({ text: chunk, source: item.url })
        }
      }
    }

    if (texts.length === 0) return 0

    const { embeddings } = await embedMany({
      model: this.embedModel,
      values: texts.map((t) => t.text),
    })

    const entries: VectorDocEntry[] = texts.map((t, idx) => {
      return {
        id: randomUUID(),
        source: t.source,
        text: t.text,
        embedding: embeddings[idx],
      }
    })

    await this.writeEntries(collection, entries)

    return entries.length
  }

  private async loadCollection(collection: string): Promise<VectorDocEntry[]> {
    const p = getCollectionPath(collection)
    if (!fs.existsSync(p)) return []
    const lines = fs.readFileSync(p, "utf8").split(/\n+/).filter(Boolean)
    return lines.map((l) => JSON.parse(l))
  }

  async similaritySearch(collection: string, query: string, k = 8) {
    const all = await this.loadCollection(collection)
    if (all.length === 0) return [] as VectorDocEntry[]

    const { embedding } = await embed({ model: this.embedModel, value: query })

    const scored = all.map((doc) => {
      return { doc, score: cosineSimilarity(doc.embedding, embedding) }
    })

    scored.sort((a, b) => b.score - a.score)

    return scored.slice(0, k).map((s) => s.doc)
  }
} 