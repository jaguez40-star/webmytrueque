import { Route, Routes, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { MainPage } from '@/features/landing/pages/MainPage'
import { PanelPage } from '@/features/orders/pages/PanelPage'
import { DetalleOrdenPage } from '@/features/orders/pages/DetalleOrdenPage'
import { NuevaOrdenPage } from '@/features/orders/pages/NuevaOrdenPage'
import { ModalNuevaOrden } from '@/features/orders/components/ModalNuevaOrden'
import { RutaPrivada } from '@/features/auth/components/RutaPrivada'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useEsPantallaAncha } from '@/shared/hooks/useMediaQuery'

/** Lo que PanelPage guarda en `state` al abrir la creación desde el panel. */
interface EstadoConFondo {
  background?: Location
}

export function App() {
  // La hidratación de la sesión vive aquí y no dentro de una pantalla concreta: si alguien
  // entra directo a /panel, la landing nunca se monta y GET /auth/me jamás se dispararía,
  // dejando al usuario fuera de su propio panel pese a tener cookie válida.
  useCurrentUser()

  const location = useLocation()
  const esAncha = useEsPantallaAncha()

  // "Ubicación de fondo": al navegar desde el panel se guarda de dónde se venía. Si existe
  // Y la ventana da de sí, las rutas se resuelven contra ESA ubicación —así el panel sigue
  // montado detrás— y el modal se pinta encima.
  //
  // En teléfono se ignora a propósito: el formulario mide 1337px y con el teclado abierto
  // quedan ~450px útiles, así que dentro de un modal el campo del monto acaba tapado. Ahí
  // se navega de verdad, a pantalla completa.
  const estado = location.state as EstadoConFondo | null
  const fondo = esAncha ? estado?.background : undefined

  return (
    <>
      <Routes location={fondo ?? location}>
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
          path="/panel/orden/:id"
          element={
            <RutaPrivada>
              <DetalleOrdenPage />
            </RutaPrivada>
          }
        />
        <Route path="*" element={<MainPage />} />
      </Routes>

      {fondo && (
        <Routes>
          <Route
            path="/panel/nueva"
            element={
              <RutaPrivada>
                <ModalNuevaOrden />
              </RutaPrivada>
            }
          />
        </Routes>
      )}
    </>
  )
}
