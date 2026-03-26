import { auth } from "@/auth"
import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { ArtifactType } from "@/lib/types"

const PROMPTS: Record<ArtifactType, (context: string) => string> = {
  brd: (context) => `You are a senior business analyst specializing in digital CRO for Spectrum.com, Charter Communications' digital sales platform.

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

  epic: (context) => `You are a senior product manager for Spectrum.com's Digital Sales team.

Based on this Business Requirements Document, create 4-5 Epics that organize the development work:

${context}

For each Epic provide:
**Epic [N]: [Title]**
- **Description**: 2-3 sentence overview
- **Business Value**: How this Epic contributes to CRO goals
- **Acceptance Criteria**: 3-5 high-level criteria
- **Story Points**: Fibonacci estimate (13, 21, 34, 55)
- **Dependencies**: Any dependencies on other Epics

---

Separate each Epic with a horizontal rule. Be specific to Spectrum.com. Use markdown.`,

  story: (context) => `You are a senior product manager for Spectrum.com's Digital Sales team.

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

  test_case: (context) => `You are a QA engineer specializing in e-commerce testing for Spectrum.com.

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
    max_tokens: 3000,
  })

  const content = completion.choices[0].message.content ?? ""
  return NextResponse.json({ content, title })
}
