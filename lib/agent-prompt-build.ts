import type { ArtifactType } from "./types"
import {
  createDefaultAgentPrompts,
  type AgentPromptsState,
} from "./agent-prompt-defaults"

const TYPE_LABELS: Record<ArtifactType, string> = {
  initiative_brief: "Initiative brief (Discovery)",
  brd: "Business Requirements Document",
  epic: "Epic",
  story: "User Story",
  test_case: "Test Case",
  screen_layout: "Screen layout (Figma-oriented specification)",
}

const REVISION_RULES: Record<ArtifactType, string> = {
  initiative_brief: `Rewrite the full initiative brief in clean markdown. Keep sections such as problem/outcome, audience, success signals, bets, risks, and open questions unless the feedback asks to change structure. Apply the feedback thoroughly. No preamble—output only the revised markdown body.`,
  brd: `Rewrite the full artifact in clean markdown. Apply the feedback thoroughly while keeping the same general document structure and headings where sensible. Do not add a preamble—output only the revised markdown body.`,
  epic: `Rewrite the full artifact in clean markdown. Apply the feedback thoroughly while keeping the same general document structure and headings where sensible. Do not add a preamble—output only the revised markdown body.`,
  story: `Rewrite the full artifact in clean markdown. Apply the feedback thoroughly while keeping the same general document structure and headings where sensible. Do not add a preamble—output only the revised markdown body.`,
  test_case: `Rewrite the full artifact in clean markdown. Apply the feedback thoroughly while keeping the same general document structure and headings where sensible. Do not add a preamble—output only the revised markdown body.`,
  screen_layout: `Revise the screen layout spec: keep the markdown sections, then end with a single valid \`\`\`json ... \`\`\` block (figmaHandoffVersion + document.frames) as in the original. Apply the feedback throughout. No preamble—output only the full revised artifact.`,
}

/** Merge partial overrides with defaults (for API bodies that send only changed fields). */
export function resolveAgentPrompts(
  partial?: Partial<AgentPromptsState> | null
): AgentPromptsState {
  const d = createDefaultAgentPrompts()
  if (!partial) return d
  return {
    sage: { ...d.sage, ...(partial.sage ?? {}) },
    generation: { ...d.generation, ...(partial.generation ?? {}) },
    quill: partial.quill?.trim() ? partial.quill : d.quill,
  }
}

export function buildSageSystemContent(
  projectContext: string | undefined,
  prompts: AgentPromptsState
): string {
  const { systemPrompt, contextWrapTemplate } = prompts.sage
  const ctx = projectContext?.trim()
  if (!ctx) return systemPrompt
  const wrap = contextWrapTemplate.includes("{{PROJECT_CONTEXT}}")
    ? contextWrapTemplate.replace(/\{\{PROJECT_CONTEXT\}\}/g, ctx)
    : `${contextWrapTemplate}\n${ctx}`
  return `${systemPrompt}${wrap}`
}

export function buildGenerationUserMessage(
  type: ArtifactType,
  context: string,
  prompts: AgentPromptsState
): string {
  const template = prompts.generation[type]?.trim()
  const fallback = createDefaultAgentPrompts().generation[type]
  const t = template || fallback
  if (t.includes("{{CONTEXT}}")) {
    return t.replace(/\{\{CONTEXT\}\}/g, context)
  }
  return `${t}\n\n${context}`
}

export function buildQuillUserMessage(
  type: ArtifactType,
  title: string,
  content: string,
  feedback: string,
  prompts: AgentPromptsState
): string {
  const template = prompts.quill?.trim() || createDefaultAgentPrompts().quill
  const rules = REVISION_RULES[type]
  let out = template
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/\{\{TYPE_LABEL\}\}/g, TYPE_LABELS[type])
    .replace(/\{\{CONTENT\}\}/g, content)
    .replace(/\{\{FEEDBACK\}\}/g, feedback)
  if (out.includes("{{REVISION_RULES}}")) {
    out = out.replace(/\{\{REVISION_RULES\}\}/g, rules)
  } else {
    out = `${out}\n\n${rules}`
  }
  return out
}

/** Document placeholders shown in settings UI */
export const PROMPT_PLACEHOLDER_HELP = {
  sage: {
    system: "Role and expertise (sent as the system message base).",
    contextWrap:
      "Appended when initiative context exists. Include exactly {{PROJECT_CONTEXT}} where the context should appear.",
  },
  generation:
    "Each template must include {{CONTEXT}} exactly once — initiative or parent artifact content is inserted there.",
  quill:
    "Use {{TITLE}}, {{TYPE_LABEL}}, {{CONTENT}}, {{FEEDBACK}}, and {{REVISION_RULES}}. Type-specific revision instructions are injected for {{REVISION_RULES}}.",
} as const
