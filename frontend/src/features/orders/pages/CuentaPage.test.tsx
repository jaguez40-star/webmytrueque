import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { CuentaPage } from './CuentaPage'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

describe('CuentaPage', () => {
  it('muestra el @usuario y el correo de la sesión', () => {
    renderConWrappers(<CuentaPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/cuenta' })
    expect(screen.getByTestId('mi-handle')).toHaveTextContent('@trq-925j')
    expect(screen.getByTestId('mi-correo')).toHaveTextContent('ana@correo.com')
  })

  it('ofrece cerrar sesión', () => {
    renderConWrappers(<CuentaPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/cuenta' })
    expect(screen.getByRole('button', { name: /Cerrar sesión/ })).toBeEnabled()
  })
})
