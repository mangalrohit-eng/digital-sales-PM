import type { ArtifactType } from "./types"

/** Specialist models used for generation and refinement steps. */
export interface WorkbenchAgent {
  id: string
  name: string
  role: string
  tagline: string
}

export const AGENT_SAGE: WorkbenchAgent = {
  id: "sage",
  name: "Sage",
  role: "Overview chat agent",
  tagline: "Grounds Overview discovery chat in Spectrum.com digital sales context.",
}

/** Ideas tab — brainstorm and refine initiative ideas before the Brief. */
export const AGENT_SCOUT: WorkbenchAgent = {
  id: "scout",
  name: "Scout",
  role: "Ideas workspace agent",
  tagline: "Explores solution paths, tightens initiative ideas, and compares trade-offs with the PM.",
}

export const AGENT_MORGAN: WorkbenchAgent = {
  id: "morgan",
  name: "Morgan",
  role: "Requirements architect",
  tagline: "Turns initiative context into a structured BRD.",
}

export const AGENT_ATLAS: WorkbenchAgent = {
  id: "atlas",
  name: "Atlas",
  role: "Program structuring agent",
  tagline: "Breaks the BRD into themed epics with value and scope.",
}

export const AGENT_SCRIBE: WorkbenchAgent = {
  id: "scribe",
  name: "Scribe",
  role: "Backlog agent",
  tagline: "Writes sprint-ready user stories with acceptance criteria.",
}

export const AGENT_SENTINEL: WorkbenchAgent = {
  id: "sentinel",
  name: "Sentinel",
  role: "Quality agent",
  tagline: "Derives test cases from each story—functional, edge, and a11y.",
}

export const AGENT_FRAME: WorkbenchAgent = {
  id: "frame",
  name: "Frame",
  role: "Layout & handoff agent",
  tagline: "Produces screen specs and Figma-oriented JSON from stories.",
}

export const AGENT_QUILL: WorkbenchAgent = {
  id: "quill",
  name: "Quill",
  role: "Editorial agent",
  tagline: "Rewrites artifacts from your feedback while preserving intent.",
}

/** Delivery / export integrations (e.g. Jira). */
export const AGENT_COURIER: WorkbenchAgent = {
  id: "courier",
  name: "Courier",
  role: "Delivery agent",
  tagline: "Routes approved work into Jira and other tools.",
}

export const ARTIFACT_AGENTS: Record<ArtifactType, WorkbenchAgent> = {
  initiative_brief: AGENT_SAGE,
  brd: AGENT_MORGAN,
  epic: AGENT_ATLAS,
  story: AGENT_SCRIBE,
  test_case: AGENT_SENTINEL,
  screen_layout: AGENT_FRAME,
}

export function getAgentForArtifactType(type: ArtifactType): WorkbenchAgent {
  return ARTIFACT_AGENTS[type]
}

export function agentInitials(agent: WorkbenchAgent): string {
  return agent.name.slice(0, 2).toUpperCase()
}
