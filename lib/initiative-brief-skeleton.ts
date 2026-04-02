/** Fallback brief when the model returns nothing (mirrors API route behavior). */
export function skeletonBriefFromContext(
  projectContext: string,
  transcript: string
): string {
  const ctx = projectContext.trim() || "_No problem statement or additional thoughts yet._"
  const chatEmpty = !transcript.trim()
  const note = chatEmpty
    ? "Expand Overview (problem statement or additional thoughts), or add Brief tab chat notes, then regenerate."
    : "The model returned no text; try again or add a short note in Brief chat and regenerate."

  const initiativeLine =
    ctx.match(/^Initiative:\s*(.+)$/m)?.[1]?.trim() || "this initiative"

  return `## Problem / outcome
- Shape and validate the problem statement for **${initiativeLine}** using Overview; ${note}

## Audience & context
- Internal owner and status are in the project context below.
${ctx.slice(0, 1400)}${ctx.length > 1400 ? "\n\n_(context truncated)_" : ""}

## Success signals
- Clearer funnel progression and fewer drop-offs on key steps (confirm metrics with stakeholders).
- Improved self-service completion where applicable.

## Bets & scope hints
- Focus on Spectrum.com digital sales journey (plans, eligibility, cart/checkout) unless context specifies otherwise.

## Risks & dependencies
- Dependencies on billing, identity/eligibility, and fulfillment systems typical for digital sales.

## Open questions
- What is the single primary outcome for this initiative?
- Which platforms or segments are in scope vs out of scope?
- What deadlines or compliance constraints must the brief call out?
`
}
