import type { Artifact } from "./types"

/** Artifacts in the library (Artifacts tab, export, overview counts). Workspace drafts use `published: false`. */
export function isPublishedToLibrary(a: Artifact): boolean {
  return a.published !== false
}
