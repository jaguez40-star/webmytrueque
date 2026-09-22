import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { RutaPrivada } from './RutaPrivada'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

function Arbol() {
  return (
    <Routes>
      <Route path="/" element={<p>Landing pública</p>} />
      <Route
        path="/panel"
        element={
          <RutaPrivada>
            <p>Contenido privado</p>
          </RutaPrivada>
        }
      />
    </Routes>
  )
}

describe('RutaPrivada', () => {
  it('deja ver el contenido cuando hay sesión', () => {
    renderConWrappers(<Arbol />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })
    expect(screen.getByText('Contenido privado')).toBeInTheDocument()
  })

  it('manda a la landing cuando no hay sesión', () => {
    renderConWrappers(<Arbol />, { usuario: null, ruta: '/panel' })
    expect(screen.getByText('Landing pública')).toBeInTheDocument()
    expect(screen.queryByText('Contenido privado')).not.toBeInTheDocument()
  })

  it('espera sin expulsar mientras la sesión se está resolviendo', () => {
    renderConWrappers(<Arbol />, { usuario: null, hidratando: true, ruta: '/panel' })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Landing pública')).not.toBeInTheDocument()
  })
})
