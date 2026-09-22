import { Route, Routes } from 'react-router-dom'
import { MainPage } from '@/features/landing/pages/MainPage'
import { PanelPage } from '@/features/orders/pages/PanelPage'
import { DetalleOrdenPage } from '@/features/orders/pages/DetalleOrdenPage'
import { NuevaOrdenPage } from '@/features/orders/pages/NuevaOrdenPage'
import { CuentaPage } from '@/features/orders/pages/CuentaPage'
import { RutaPrivada } from '@/features/auth/components/RutaPrivada'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'

export function App() {
  // La hidratación de la sesión vive aquí y no dentro de una pantalla concreta: si alguien
  // entra directo a /panel, la landing nunca se monta y GET /auth/me jamás se dispararía,
  // dejando al usuario fuera de su propio panel pese a tener cookie válida.
  useCurrentUser()

  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route
        path="/panel"
        element={
          <RutaPrivada>
            <PanelPage />
          </RutaPrivada>
        }
      />
      <Route
        path="/panel/nueva"
        element={
          <RutaPrivada>
            <NuevaOrdenPage />
          </RutaPrivada>
        }
      />
      <Route
        path="/panel/cuenta"
        element={
          <RutaPrivada>
            <CuentaPage />
          </RutaPrivada>
        }
      />
      <Route
        path="/panel/orden/:id"
        element={
          <RutaPrivada>
            <DetalleOrdenPage />
          </RutaPrivada>
        }
      />
      <Route path="*" element={<MainPage />} />
    </Routes>
  )
}
