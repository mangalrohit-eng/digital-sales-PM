/** OpenAI structured-output schema for `IdeationWorkspace` (strict JSON). */
export const IDEATION_WORKSPACE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "problemRestatement",
    "landscapeMarkdown",
    "ideas",
    "sourcesMarkdown",
  ],
  properties: {
    problemRestatement: { type: "string" },
    landscapeMarkdown: { type: "string" },
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "title",
          "tagline",
          "detailMarkdown",
          "researchBasis",
        ],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          tagline: { type: "string" },
          detailMarkdown: { type: "string" },
          researchBasis: { type: "string" },
        },
      },
    },
    sourcesMarkdown: { type: "string" },
  },
} as const
