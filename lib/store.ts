"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { Project, Artifact, ChatMessage, Comment } from "./types"

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
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: [],
      artifacts: [],

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
            p.id === projectId ? { ...p, chatHistory: [] } : p
          ),
        }))
      },
    }),
    {
      name: "charter-digital-sales-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
    }
  )
)
