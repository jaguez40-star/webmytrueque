import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface RutaPrivadaProps {
  children: ReactNode
}

/**
 * Deja pasar solo con sesión activa.
 *
 * 🔴 El caso `isHydrating` es obligatorio y NO es cosmético: al recargar /panel, el store
 * arranca con `user: null` mientras `GET /auth/me` viaja. Sin este chequeo, quien recarga
 * con una cookie perfectamente válida sale rebotado a la landing antes de que la respuesta
 * llegue.
 */
export function RutaPrivada({ children }: RutaPrivadaProps) {
  const user = useAuthStore((state) => state.user)
  const isHydrating = useAuthStore((state) => state.isHydrating)

  if (isHydrating) {
    return (
      <div
        role="status"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          letterSpacing: '0.08em',
        }}
      >
        CARGANDO…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
