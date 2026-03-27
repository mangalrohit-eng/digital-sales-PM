/**
 * Chat completion `message.content` may be a string, null, or (in newer APIs) an array
 * of parts. Coerce to plain text so we never treat non-strings as empty incorrectly.
 */
export function messageContentToString(content: unknown): string {
  if (content == null) return ""
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .map((part) => {
      if (typeof part === "string") return part
      if (part && typeof part === "object" && "text" in part) {
        const t = (part as { text?: unknown }).text
        return typeof t === "string" ? t : ""
      }
      return ""
    })
    .join("")
}
