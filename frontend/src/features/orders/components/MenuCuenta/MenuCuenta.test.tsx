import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuCuenta } from './MenuCuenta'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

describe('MenuCuenta', () => {
  it('arranca cerrado: el avatar está, la cuenta no', () => {
    renderConWrappers(<MenuCuenta />, { usuario: USUARIO_DE_PRUEBA })
    const avatar = screen.getByRole('button', { name: /Tu cuenta/ })
    expect(avatar).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('mi-correo')).not.toBeInTheDocument()
  })

  it('al pulsar el avatar muestra el @usuario, el correo y cerrar sesión', async () => {
    const user = userEvent.setup()
    renderConWrappers(<MenuCuenta />, { usuario: USUARIO_DE_PRUEBA })

    await user.click(screen.getByRole('button', { name: /Tu cuenta/ }))

    expect(screen.getByTestId('mi-handle')).toHaveTextContent('@trq-925j')
    expect(screen.getByTestId('mi-correo')).toHaveTextContent('ana@correo.com')
    expect(screen.getByRole('button', { name: /Cerrar sesión/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Tu cuenta/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('se cierra con Escape', async () => {
    const user = userEvent.setup()
    renderConWrappers(<MenuCuenta />, { usuario: USUARIO_DE_PRUEBA })

    await user.click(screen.getByRole('button', { name: /Tu cuenta/ }))
    expect(screen.getByTestId('mi-correo')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('mi-correo')).not.toBeInTheDocument()
  })
})
