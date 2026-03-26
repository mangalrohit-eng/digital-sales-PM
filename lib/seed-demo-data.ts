import type { Artifact, Project } from "./types"

/** Stable IDs so dashboard links stay valid after refresh. */
export const DEMO_PROJECT_ID = "demo-seed-project-001"

const created = "2025-02-10T14:00:00.000Z"
const updated = "2025-02-18T10:30:00.000Z"

export const DEMO_SEED_PROJECT: Project = {
  id: DEMO_PROJECT_ID,
  name: "Checkout conversion uplift — demo initiative",
  description:
    "Pre-loaded example: streamline guest checkout, reduce abandonment, and align UX with mobile-first journeys.",
  cro_context:
    "Primary KPI: +2.5% checkout completion within 90 days. Focus on address verification, payment trust signals, and one-page vs multi-step test. Audience: new internet shoppers on mobile Safari and Chrome.",
  owner: "Alex M",
  ownerRole: "analyst",
  createdAt: created,
  status: "active",
  chatHistory: [
    {
      role: "user",
      content:
        "What are the top 3 quick wins for reducing cart abandonment on mobile checkout?",
    },
    {
      role: "assistant",
      content:
        "1) Surface delivery ETA and total price earlier in the flow. 2) Reduce form fields with smart defaults for address. 3) Add prominent trust badges and saved-payment options before the pay step.",
    },
  ],
}

const md = (title: string, body: string) => `## ${title}\n\n${body}\n`

export const DEMO_SEED_ARTIFACTS: Artifact[] = [
  {
    id: "demo-seed-brd",
    projectId: DEMO_PROJECT_ID,
    parentId: null,
    type: "brd",
    title: "BRD: Checkout conversion uplift — demo initiative",
    status: "approved",
    jiraTicketId: "SPEC-1042",
    comments: [
      {
        id: "demo-cmt-1",
        artifactId: "demo-seed-brd",
        author: "Josh D",
        authorRole: "admin",
        text: "Approved — aligns with Q1 digital sales priorities.",
        createdAt: "2025-02-12T09:00:00.000Z",
      },
    ],
    content: md(
      "Executive summary",
      "Initiative targets mobile checkout completion for new internet customers. Scope covers funnel steps from cart through payment confirmation."
    ),
    createdAt: created,
    updatedAt: updated,
  },
  {
    id: "demo-seed-epic-1",
    projectId: DEMO_PROJECT_ID,
    parentId: "demo-seed-brd",
    type: "epic",
    title: "Epic: Streamline address & delivery clarity",
    status: "approved",
    jiraTicketId: "SPEC-1043",
    comments: [],
    content: md(
      "Description",
      "Reduce drop-off at address verification by clarifying serviceability and delivery windows earlier."
    ),
    createdAt: created,
    updatedAt: updated,
  },
  {
    id: "demo-seed-epic-2",
    projectId: DEMO_PROJECT_ID,
    parentId: "demo-seed-brd",
    type: "epic",
    title: "Epic: Payment trust & friction",
    status: "in_review",
    comments: [],
    content: md(
      "Description",
      "Improve perceived security and reduce steps to complete payment on mobile."
    ),
    createdAt: created,
    updatedAt: updated,
  },
  {
    id: "demo-seed-story-1",
    projectId: DEMO_PROJECT_ID,
    parentId: "demo-seed-epic-1",
    type: "story",
    title: "Story: Show serviceability banner after ZIP entry",
    status: "approved",
    jiraTicketId: "SPEC-1044",
    comments: [],
    content: md(
      "User story",
      "As a new shopper, I want immediate confirmation that service is available at my address so that I do not waste time in checkout."
    ),
    createdAt: created,
    updatedAt: updated,
  },
  {
    id: "demo-seed-story-2",
    projectId: DEMO_PROJECT_ID,
    parentId: "demo-seed-epic-1",
    type: "story",
    title: "Story: Autocomplete address with manual override",
    status: "draft",
    comments: [],
    content: md(
      "User story",
      "As a shopper, I want address suggestions with the ability to correct them so that delivery details stay accurate."
    ),
    createdAt: created,
    updatedAt: updated,
  },
  {
    id: "demo-seed-story-3",
    projectId: DEMO_PROJECT_ID,
    parentId: "demo-seed-epic-2",
    type: "story",
    title: "Story: Sticky order summary on mobile pay step",
    status: "in_review",
    comments: [],
    content: md(
      "User story",
      "As a mobile buyer, I want to see total and recurring charges while entering card details so that I feel confident before submitting."
    ),
    createdAt: created,
    updatedAt: updated,
  },
  {
    id: "demo-seed-tc-1",
    projectId: DEMO_PROJECT_ID,
    parentId: "demo-seed-story-1",
    type: "test_case",
    title: "Tests: Show serviceability banner after ZIP entry",
    status: "approved",
    comments: [],
    content: md(
      "TC-1",
      "**Preconditions:** Guest session, mobile viewport.\n**Steps:** Enter valid ZIP in checkout.\n**Expected:** Green serviceability banner with plan summary."
    ),
    createdAt: created,
    updatedAt: updated,
  },
  {
    id: "demo-seed-tc-2",
    projectId: DEMO_PROJECT_ID,
    parentId: "demo-seed-story-2",
    type: "test_case",
    title: "Tests: Autocomplete address with manual override",
    status: "draft",
    comments: [],
    content: md(
      "TC-1 (draft)",
      "Negative path: user overrides suggested street number — order reflects manual input."
    ),
    createdAt: created,
    updatedAt: updated,
  },
  {
    id: "demo-seed-layout",
    projectId: DEMO_PROJECT_ID,
    parentId: null,
    type: "screen_layout",
    title: "Screen layout: Mobile checkout (ZIP → pay)",
    status: "draft",
    comments: [],
    content: `## Frames\n\n- **Cart** — primary CTA, trust row.\n- **Address** — ZIP first, serviceability banner slot.\n- **Payment** — sticky summary, card fields, legal copy.\n\n\`\`\`json\n${JSON.stringify(
      {
        figmaImportVersion: "1.0-demo",
        document: {
          name: "Mobile checkout",
          frames: [
            {
              name: "Address / ZIP",
              width: 390,
              height: 844,
              layoutMode: "VERTICAL",
              padding: 16,
              itemSpacing: 12,
              children: [
                {
                  type: "TEXT",
                  characters: "Service address",
                  fontSize: 20,
                  fontWeight: 600,
                },
                {
                  type: "TEXT",
                  characters: "Enter your ZIP to see available plans.",
                  fontSize: 14,
                  fontWeight: 400,
                },
                {
                  type: "FRAME",
                  name: "ZIP field",
                  layoutMode: "VERTICAL",
                  padding: 12,
                  itemSpacing: 6,
                  children: [
                    {
                      type: "TEXT",
                      characters: "ZIP code",
                      fontSize: 11,
                      fontWeight: 500,
                    },
                    {
                      type: "TEXT",
                      characters: "90210",
                      fontSize: 16,
                      fontWeight: 400,
                    },
                  ],
                },
                {
                  type: "FRAME",
                  name: "Primary CTA",
                  layoutMode: "HORIZONTAL",
                  padding: 14,
                  itemSpacing: 8,
                  children: [
                    {
                      type: "TEXT",
                      characters: "Continue",
                      fontSize: 16,
                      fontWeight: 600,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      null,
      2
    )}\n\`\`\`\n`,
    createdAt: created,
    updatedAt: updated,
  },
]
