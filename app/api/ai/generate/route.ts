import { auth } from "@/auth"
import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ArtifactType } from "@/lib/types"

export const maxDuration = 60

const PROMPTS: Record<ArtifactType, (context: string) => string> = {
  brd: (context) => `You are Morgan, a requirements-architect agent in RelayBench. Operate as a senior business analyst specializing in digital sales and online funnel optimization for Spectrum.com, a digital subscription and services sales platform.

Create a comprehensive Business Requirements Document (BRD) for the following initiative:

${context}

Structure the BRD with these sections:
## 1. Executive Summary
## 2. Business Objectives & Success Metrics
(Include specific KPIs: conversion rate lift %, order volume, revenue impact estimate)
## 3. Scope
(Clearly define In-Scope and Out-of-Scope items)
## 4. Stakeholders
## 5. Current State & Problem Statement
## 6. Proposed Solution Overview
## 7. Functional Requirements
(Numbered list, specific and testable)
## 8. Non-Functional Requirements
(Performance, accessibility WCAG 2.1 AA, mobile responsiveness)
## 9. Assumptions & Dependencies
## 10. Risks & Mitigations
## 11. Timeline Estimate

Be specific to Spectrum.com's digital sales context. Format in clean markdown.`,

  epic: (context) => `You are Atlas, an epic-structuring agent in RelayBench. Operate as a senior product manager for Spectrum.com's Digital Sales team.

Based on this Business Requirements Document, create 4-5 Epics that organize the development work:

${context}

For each Epic provide:
**Epic [N]: [Title]**
- **Description**: 2-3 sentence overview
- **Business Value**: How this Epic contributes to Digital Sales and conversion goals
- **Acceptance Criteria**: 3-5 high-level criteria
- **Story Points**: Fibonacci estimate (13, 21, 34, 55)
- **Dependencies**: Any dependencies on other Epics

---

Separate each Epic with a horizontal rule. Be specific to Spectrum.com. Use markdown.`,

  story: (context) => `You are Scribe, a backlog-writing agent in RelayBench. Operate as a senior product manager for Spectrum.com's Digital Sales team.

Based on this Epic, create 4-6 detailed User Stories ready for sprint planning:

${context}

For each User Story provide:
**Story [N]: [Title]**
- **User Story**: As a [specific Spectrum.com persona], I want [feature/capability] so that [business/user benefit]
- **Acceptance Criteria**:
  - Given [context] When [action] Then [expected result]
  - (3-5 acceptance criteria total)
- **Story Points**: Fibonacci (1, 2, 3, 5, 8)
- **Priority**: Critical / High / Medium / Low
- **Definition of Done**: Brief checklist
- **Notes**: Edge cases or design considerations

---

Use Spectrum.com-specific personas: "new internet customer", "existing customer upgrading", "customer moving to new address", "mobile shopper", etc. Use markdown.`,

  test_case: (context) => `You are Sentinel, a quality-assurance agent in RelayBench. Operate as a QA engineer specializing in e-commerce testing for Spectrum.com.

Based on this User Story, create comprehensive test cases:

${context}

For each test case provide:
**TC-[N]: [Title]**
- **Type**: Functional / Edge Case / Negative / Accessibility / Performance
- **Priority**: P1 / P2 / P3
- **Preconditions**: What must be true before the test
- **Test Steps**:
  1. Step one
  2. Step two
  (etc.)
- **Expected Result**: What success looks like
- **Pass Criteria**: Specific measurable outcome

---

Cover: happy path, edge cases, negative scenarios, mobile behavior, and accessibility (WCAG 2.1 AA). Use markdown.`,

  screen_layout: (context) => `You are Frame, a layout-and-handoff agent in RelayBench. Operate as a senior product designer and UX architect for a digital sales / e-commerce web experience.

Using the user stories and flows below, produce a **screen layout specification** suitable for handoff to design tools (Figma) and engineering.

${context}

## Output requirements

### Part A — Markdown (human-readable)
Include these sections with clear headings:
## 1. Experience overview
## 2. Key screens & user journeys (map stories to screens)
## 3. Desktop layouts (per screen: regions, hierarchy, primary CTAs)
## 4. Mobile / responsive notes
## 5. Component inventory (buttons, forms, cards, modals) with suggested naming for design system
## 6. Spacing & grid (base unit, columns, gutters) — use 8px system
## 7. Accessibility & states (focus, error, empty, loading)

### Part B — Machine-readable Figma-oriented JSON (required)
After the markdown, output **one** fenced code block with language \`json\` containing a single JSON object with this shape (fill with real content, no placeholders like "TBD"):
{
  "figmaHandoffVersion": "1.0",
  "document": {
    "name": "string — initiative title",
    "frames": [
      {
        "name": "string — e.g. Desktop / Checkout",
        "width": 1440,
        "height": 900,
        "layoutMode": "VERTICAL" | "HORIZONTAL",
        "padding": 24,
        "itemSpacing": 16,
        "children": [
          { "type": "TEXT", "name": "string", "characters": "string", "fontSize": 16, "fontWeight": 400 },
          { "type": "FRAME", "name": "string", "width": 400, "height": 200, "layoutMode": "VERTICAL", "children": [] }
        ]
      }
    ],
    "components": [ { "name": "string", "description": "string" } ],
    "tokens": { "space": { "xs": 4, "sm": 8, "md": 16, "lg": 24 }, "radius": { "sm": 4, "md": 8 } }
  }
}

Rules: Valid JSON only inside the fence. RGB in nested objects use decimals 0–1 if you include color. Keep the tree shallow enough to stay under token limits but representative of every major screen.`,
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const {
    type,
    context,
    title,
  }: { type: ArtifactType; context: string; title: string } = await req.json()

  const cookieStore = await cookies()
  const runtimeKey = cookieStore.get("openai_key")?.value
  const apiKey = runtimeKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Go to Settings to add your key." },
      { status: 400 }
    )
  }

  const openai = new OpenAI({ apiKey })

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: PROMPTS[type](context) }],
    temperature: 0.7,
    max_tokens: type === "screen_layout" ? 4500 : 3000,
  })

  const content = completion.choices[0].message.content ?? ""
  return NextResponse.json({ content, title })
}
