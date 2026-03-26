import type { ArtifactType } from "./types"

/** Named AI agents in RelayBench — each owns a class of automated work. */
export interface WorkbenchAgent {
  id: string
  name: string
  role: string
  tagline: string
}

export const AGENT_SAGE: WorkbenchAgent = {
  id: "sage",
  name: "Sage",
  role: "Discovery agent",
  tagline: "Explores opportunities, friction, and hypotheses for digital sales.",
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

/** Simulated delivery for export flows (e.g. Jira). */
export const AGENT_COURIER: WorkbenchAgent = {
  id: "courier",
  name: "Courier",
  role: "Delivery agent",
  tagline: "Routes approved work into Jira and other tools.",
}

export const ARTIFACT_AGENTS: Record<ArtifactType, WorkbenchAgent> = {
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
