/**
 * One-off UX audit: login, dashboard, workbench tabs. Run with dev server up:
 *   node scripts/ux-audit-screenshots.mjs
 */
import { chromium } from "playwright"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000"
const OUT = path.join(__dirname, "..", "audit-screenshots")

const SEED_PROJECT = "demo-seed-project-001"

async function shot(page, name, fullPage = true) {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage })
  console.log("Wrote", file)
}

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  baseURL: BASE,
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
})
const page = await context.newPage()

try {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60000 })
  await shot(page, "01-login", false)

  const csrfRes = await context.request.get("/api/auth/csrf")
  if (!csrfRes.ok()) throw new Error(`csrf ${csrfRes.status()}`)
  const { csrfToken } = await csrfRes.json()
  const loginRes = await context.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: "analyst",
      password: "ACN2026",
      callbackUrl: `${BASE}/dashboard`,
    },
    maxRedirects: 5,
  })
  if (!loginRes.ok() && loginRes.status() !== 302) {
    const t = await loginRes.text()
    throw new Error(`login ${loginRes.status()}: ${t.slice(0, 200)}`)
  }

  await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60000 })
  await page.waitForLoadState("networkidle")
  await shot(page, "02-dashboard")

  await page.goto(`${BASE}/projects/${SEED_PROJECT}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  })
  await page.waitForLoadState("networkidle")
  await shot(page, "03-workbench-overview")

  const tabs = [
    ["brainstorm", "04-workbench-discovery"],
    ["agent-brd", "05-workbench-brd"],
    ["artifacts", "06-artifacts"],
    ["export", "07-export"],
  ]
  for (const [tab, fname] of tabs) {
    await page.goto(`${BASE}/projects/${SEED_PROJECT}?tab=${tab}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    })
    await page.waitForTimeout(600)
    await shot(page, fname)
  }

  await page.goto(`${BASE}/settings`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  })
  await page.waitForTimeout(400)
  await shot(page, "08-settings")
} catch (e) {
  console.error(e)
  await shot(page, "99-error", true)
  process.exitCode = 1
} finally {
  await browser.close()
}
