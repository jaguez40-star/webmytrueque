import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuCuenta } from '../components/MenuCuenta'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

const escribir = vi.fn(() => Promise.resolve())
// Tipado explícito: sin el parámetro, TS infiere tuplas vacías en `mock.calls` y
// `calls[0][0]` no compila.
const compartirNativo = vi.fn((_datos: ShareData) => Promise.resolve())

/**
 * Dos trampas juntas:
 * 1. `vi.stubGlobal('navigator', …)` no sirve: en jsdom `navigator` es un getter no
 *    configurable del global, hay que redefinir las propiedades concretas.
 * 2. `userEvent.setup()` instala SU PROPIO stub de `navigator.clipboard` para simular
 *    copiar y pegar, así que este finge debe aplicarse DESPUÉS del setup o lo pisa.
 */
function fingirNavegador({ conShare }: { conShare: boolean }) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: escribir },
    configurable: true,
  })
  if (conShare) {
    Object.defineProperty(navigator, 'share', { value: compartirNativo, configurable: true })
  } else {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

async function abrirMenu({ conShare = true } = {}) {
  const user = userEvent.setup()
  fingirNavegador({ conShare })
  renderConWrappers(<MenuCuenta />, { usuario: USUARIO_DE_PRUEBA })
  await user.click(screen.getByRole('button', { name: /Tu cuenta/ }))
  return user
}

describe('copiar y compartir el @usuario', () => {
  it('copiar manda el @usuario al portapapeles y lo confirma', async () => {
    const user = await abrirMenu()
    await user.click(screen.getByRole('button', { name: /^Copiar/ }))

    expect(escribir).toHaveBeenCalledWith('@trq-925j')
    expect(await screen.findByText('¡Copiado!')).toBeInTheDocument()
  })

  it('compartir abre el menú nativo con el @usuario en el texto', async () => {
    const user = await abrirMenu()
    await user.click(screen.getByRole('button', { name: /Compartir/ }))

    expect(compartirNativo).toHaveBeenCalledTimes(1)
    expect(compartirNativo.mock.calls[0]?.[0].text).toContain('@trq-925j')
  })

  it('sin menú nativo, el botón de compartir ni se muestra', async () => {
    // Escritorio sin Web Share API: compartir haría lo mismo que copiar, así que sobra.
    await abrirMenu({ conShare: false })

    expect(screen.queryByRole('button', { name: /Compartir/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Copiar/ })).toBeInTheDocument()
  })
})
