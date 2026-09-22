import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPanel, type AuthTab } from './AuthPanel'

function renderPanel(tab: AuthTab = 'login', onTabChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AuthPanel tab={tab} onTabChange={onTabChange} />
    </QueryClientProvider>,
  )
  return { onTabChange }
}

describe('AuthPanel', () => {
  it('muestra el formulario de login cuando la pestaña es "login"', () => {
    renderPanel('login')
    expect(screen.getByRole('heading', { name: 'Bienvenido de vuelta' })).toBeInTheDocument()
  })

  it('muestra el formulario de registro (solo correo y contraseña) cuando la pestaña es "register"', () => {
    renderPanel('register')
    expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Nombre/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Correo/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Contraseña/)).toBeInTheDocument()
  })

  it('avisa al padre cuando se pulsa la otra pestaña', async () => {
    const user = userEvent.setup()
    const { onTabChange } = renderPanel('login')
    await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }))
    expect(onTabChange).toHaveBeenCalledWith('register')
  })

  it('muestra error de validación si el correo no es válido', async () => {
    const user = userEvent.setup()
    renderPanel('login')
    await user.type(screen.getByLabelText(/Correo/), 'no-es-un-correo')
    await user.type(screen.getByLabelText(/Contraseña/), 'algo')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Ese correo no parece válido.')).toBeInTheDocument()
  })

  it('el enlace de Google apunta al backend', () => {
    renderPanel('login')
    const link = screen.getByRole('link', { name: /Continuar con Google/ })
    expect(link).toHaveAttribute('href', 'http://localhost:8000/auth/google')
  })
})
