"use client"

import { create } from "zustand"
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware"
import { Project, Artifact, ChatMessage, Comment } from "./types"
import { SEED_ARTIFACTS, SEED_PROJECT } from "./seed-demo-data"
import {
  createDefaultAgentPrompts,
  type AgentPromptsState,
} from "./agent-prompt-defaults"
import { resolveAgentPrompts } from "./agent-prompt-build"

interface AppState {
  projects: Project[]
  artifacts: Artifact[]
  addProject: (
    data: Omit<Project, "id" | "createdAt" | "chatHistory">
  ) => Project
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  getProject: (id: string) => Project | undefined
  addArtifact: (
    data: Omit<Artifact, "id" | "createdAt" | "updatedAt" | "comments">
  ) => Artifact
  updateArtifact: (id: string, updates: Partial<Artifact>) => void
  deleteArtifact: (id: string) => void
  getArtifactsByProject: (projectId: string) => Artifact[]
  getArtifactsByParent: (parentId: string) => Artifact[]
  addComment: (
    artifactId: string,
    comment: Omit<Comment, "id" | "createdAt" | "artifactId">
  ) => void
  appendChatMessage: (projectId: string, message: ChatMessage) => void
  clearProjectChat: (projectId: string) => void
  agentPrompts: AgentPromptsState
  setAgentPrompts: (next: AgentPromptsState) => void
  patchAgentPrompts: (patch: {
    sage?: Partial<AgentPromptsState["sage"]>
    generation?: Partial<AgentPromptsState["generation"]>
    quill?: string
  }) => void
  resetAgentPrompts: () => void
}

/**
 * Zustand persist JSON.parse's localStorage values; truncated or hand-edited
 * data throws SyntaxError("Unexpected end of input"). Drop bad entries so the
 * app boots with merge fallbacks + seed data.
 */
function charterPersistStorage(): StateStorage {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }
  return {
    getItem: (name) => {
      try {
        const raw = localStorage.getItem(name)
        if (raw == null) return null
        JSON.parse(raw)
        return raw
      } catch {
        try {
          localStorage.removeItem(name)
        } catch {
          /* ignore */
        }
        return null
      }
    },
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, value)
      } catch {
        /* quota or private mode */
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name)
      } catch {
        /* ignore */
      }
    },
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* Default until persist rehydrates; empty storage merge also applies seed. */
      projects: [SEED_PROJECT],
      artifacts: SEED_ARTIFACTS,
      agentPrompts: createDefaultAgentPrompts(),

      setAgentPrompts: (next) => set({ agentPrompts: next }),

      patchAgentPrompts: (patch) =>
        set((s) => {
          const cur = s.agentPrompts
          return {
            agentPrompts: {
              sage: patch.sage ? { ...cur.sage, ...patch.sage } : cur.sage,
              generation: patch.generation
                ? { ...cur.generation, ...patch.generation }
                : cur.generation,
              quill: patch.quill !== undefined ? patch.quill : cur.quill,
            },
          }
        }),

      resetAgentPrompts: () =>
        set({ agentPrompts: createDefaultAgentPrompts() }),

      addProject: (data) => {
        const project: Project = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          chatHistory: [],
        }
        set((state) => ({ projects: [...state.projects, project] }))
        return project
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }))
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          artifacts: state.artifacts.filter((a) => a.projectId !== id),
        }))
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      addArtifact: (data) => {
        const artifact: Artifact = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: [],
        }
        set((state) => ({ artifacts: [...state.artifacts, artifact] }))
        return artifact
      },

      updateArtifact: (id, updates) => {
        set((state) => ({
          artifacts: state.artifacts.map((a) =>
            a.id === id
              ? { ...a, ...updates, updatedAt: new Date().toISOString() }
              : a
          ),
        }))
      },

      deleteArtifact: (id) => {
        const toDelete = new Set<string>([id])
        const allArtifacts = get().artifacts

        const collectChildren = (parentId: string) => {
          allArtifacts
            .filter((a) => a.parentId === parentId)
            .forEach((child) => {
              toDelete.add(child.id)
              collectChildren(child.id)
            })
        }
        collectChildren(id)

        set((state) => ({
          artifacts: state.artifacts.filter((a) => !toDelete.has(a.id)),
        }))
      },

      getArtifactsByProject: (projectId) =>
        get().artifacts.filter((a) => a.projectId === projectId),

      getArtifactsByParent: (parentId) =>
        get().artifacts.filter((a) => a.parentId === parentId),

      addComment: (artifactId, commentData) => {
        const comment: Comment = {
          ...commentData,
          id: crypto.randomUUID(),
          artifactId,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          artifacts: state.artifacts.map((a) =>
            a.id === artifactId
              ? { ...a, comments: [...a.comments, comment] }
              : a
          ),
        }))
      },

      appendChatMessage: (projectId, message) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, chatHistory: [...p.chatHistory, message] }
              : p
          ),
        }))
      },

      clearProjectChat: (projectId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, chatHistory: [], initiativeBrief: "" }
              : p
          ),
          artifacts: state.artifacts.map((a) =>
            a.projectId === projectId && a.type === "initiative_brief"
              ? {
                  ...a,
                  content: "",
                  published: false,
                  status: "draft",
                  updatedAt: new Date().toISOString(),
                }
              : a
          ),
        }))
      },
    }),
    {
      name: "charter-digital-sales-store",
      partialize: (state) => ({
        projects: state.projects,
        artifacts: state.artifacts,
        agentPrompts: state.agentPrompts,
      }),
      merge: (persistedState, currentState) => {
        const p = persistedState as
          | {
              projects?: Project[]
              artifacts?: Artifact[]
              agentPrompts?: AgentPromptsState
            }
          | null
          | undefined
        const hasProjects = (p?.projects?.length ?? 0) > 0
        const hasArtifacts = (p?.artifacts?.length ?? 0) > 0
        if (!hasProjects && !hasArtifacts) {
          return {
            ...currentState,
            projects: [SEED_PROJECT],
            artifacts: SEED_ARTIFACTS,
            agentPrompts: resolveAgentPrompts(p?.agentPrompts ?? null),
          }
        }
        return {
          ...currentState,
          projects: p?.projects ?? currentState.projects,
          artifacts: p?.artifacts ?? currentState.artifacts,
          agentPrompts: resolveAgentPrompts(p?.agentPrompts ?? null),
        }
      },
      storage: createJSONStorage(charterPersistStorage),
    }
  )
)
