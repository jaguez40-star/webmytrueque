import { create } from 'zustand'

export interface AuthUser {
  email: string
  /** @usuario asignado por el servidor al registrarse, ej. "@trq-9k2f". */
  handle: string
}

interface AuthState {
  user: AuthUser | null
  /** true mientras se resuelve GET /auth/me al cargar la app. */
  isHydrating: boolean
  setUser: (user: AuthUser) => void
  clearUser: () => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrating: true,
  setUser: (user) => set({ user, isHydrating: false }),
  clearUser: () => set({ user: null, isHydrating: false }),
  setHydrated: () => set({ isHydrating: false }),
}))
