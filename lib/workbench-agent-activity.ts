/** What the workbench agent is doing — drives the status headline. */
export type WorkbenchAgentActivityKind =
  | "generate_initiative_brief"
  | "refine_initiative_brief"
  | "generate_brd"
  | "refine_brd"
  | "generate_epic"
  | "refine_epic"
  | "generate_story"
  | "refine_story"
  | "generate_test_case"
  | "refine_test_case"
  | "generate_screen_layout"
  | "refine_screen_layout"
  | "refine_library_artifact"
  | "generic"

/** Honest label for data the model can see (no fake integrations). */
export type WorkbenchAgentSourceTag = {
  id: string
  label: string
}

/** Shown after a request completes so planning is visible (busy state clears immediately). */
export type WorkbenchAgentRecentPlanning = {
  headline: string
  planning: string
  contextLines: string[]
  sources: WorkbenchAgentSourceTag[]
}

/** Factual snapshot of the in-flight AI request (shown in the workbench footer). */
export type WorkbenchAgentActivityDetail = {
  kind: WorkbenchAgentActivityKind
  /** What is actually included / which API is used */
  contextLines: string[]
  /** Tags for inputs — only real sources */
  sources: WorkbenchAgentSourceTag[]
  /** Model-authored planning block (from API); set when the response returns. */
  planning?: string | null
}

export const ACTIVITY_HEADLINE: Record<WorkbenchAgentActivityKind, string> = {
  generate_initiative_brief: "Generating initiative brief",
  refine_initiative_brief: "Refining initiative brief",
  generate_brd: "Generating BRD",
  refine_brd: "Refining BRD",
  generate_epic: "Generating epics",
  refine_epic: "Refining epics",
  generate_story: "Generating user stories",
  refine_story: "Refining user stories",
  generate_test_case: "Generating test cases",
  refine_test_case: "Refining test cases",
  generate_screen_layout: "Generating screen layouts",
  refine_screen_layout: "Refining layouts",
  refine_library_artifact: "Refining artifact",
  generic: "AI request",
}
