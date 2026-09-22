/**
 * Helper de render para los tests.
 *
 * 🔴 Resetea `useAuthStore` en cada llamada. El store de zustand es un **singleton de
 * módulo**: sin este reseteo, el usuario que un test mete en el store sigue ahí en el
 * siguiente, y los tests pasan o fallan según el orden en que corran.
 */
import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore, type AuthUser } from '@/features/auth/store/authStore'

interface OpcionesRender {
  /** Usuario en sesión. null = sin sesión. */
  usuario?: AuthUser | null
  /** true = la sesión aún se está resolviendo (GET /auth/me en vuelo). */
  hidratando?: boolean
  /** Ruta inicial del router en memoria. */
  ruta?: string
}

export const USUARIO_DE_PRUEBA: AuthUser = {
  email: 'ana@correo.com',
  handle: '@trq-925j',
}

export function renderConWrappers(ui: ReactElement, opciones: OpcionesRender = {}) {
  const { usuario = null, hidratando = false, ruta = '/' } = opciones

  useAuthStore.setState({ user: usuario, isHydrating: hidratando })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrappers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ruta]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrappers })
}
