import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PanelPage } from './PanelPage'
import { ORDENES_DE_EJEMPLO } from '../data/ordersFixtures'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

// `useOrders` decide con sessionStorage al cargar el módulo, así que en los tests se
// sustituye el hook entero: es más honesto que manipular storage y recargar módulos.
vi.mock('../hooks/useOrders', () => ({
  useOrders: vi.fn(),
  useOrder: vi.fn(),
}))

const { useOrders } = await import('../hooks/useOrders')
const useOrdersMock = vi.mocked(useOrders)

afterEach(() => {
  vi.clearAllMocks()
})

describe('PanelPage', () => {
  it('sin órdenes muestra el estado vacío con el @usuario del usuario', () => {
    useOrdersMock.mockReturnValue({ orders: [], isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    expect(screen.getByText(/Tu cuenta está lista/)).toBeInTheDocument()
    expect(screen.getByTestId('mi-handle')).toHaveTextContent('@trq-925j')
    expect(screen.getByRole('link', { name: /Crear mi primera orden/ })).toHaveAttribute(
      'href',
      '/panel/nueva',
    )
  })

  it('con órdenes arranca mostrando las que le tocan al usuario', () => {
    useOrdersMock.mockReturnValue({ orders: ORDENES_DE_EJEMPLO, isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    // Las 3 de "te toca": 4821 (vendedor/PAGO_ENVIADO), 4812 (comprador/LIBERADO)
    // y 4835 (comprador/EN_INSPECCION).
    expect(screen.getByTestId('order-card-4821')).toBeInTheDocument()
    expect(screen.getByTestId('order-card-4812')).toBeInTheDocument()
    expect(screen.getByTestId('order-card-4835')).toBeInTheDocument()
    // Las de espera NO están montadas todavía.
    expect(screen.queryByTestId('order-card-4840')).not.toBeInTheDocument()
  })

  it('el filtro cambia a las órdenes que esperan a la otra parte', async () => {
    const user = userEvent.setup()
    useOrdersMock.mockReturnValue({ orders: ORDENES_DE_EJEMPLO, isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    await user.click(screen.getByRole('tab', { name: /Esperando/ }))

    expect(screen.getByTestId('order-card-4840')).toBeInTheDocument()
    expect(screen.getByTestId('order-card-4829')).toBeInTheDocument()
    expect(screen.queryByTestId('order-card-4821')).not.toBeInTheDocument()
  })
})
