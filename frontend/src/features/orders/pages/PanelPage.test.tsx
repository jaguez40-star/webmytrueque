import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { PanelPage } from './PanelPage'
import { ORDENES_DE_EJEMPLO } from '../data/ordersFixtures'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

/**
 * `useOrders` decide con sessionStorage al cargar el módulo, así que en los tests se
 * sustituye el hook entero: es más honesto que manipular storage y recargar módulos.
 */
vi.mock('../hooks/useOrders', () => ({
  useOrders: vi.fn(),
  useOrder: vi.fn(),
}))

const { useOrders } = await import('../hooks/useOrders')
const useOrdersMock = vi.mocked(useOrders)

afterEach(() => {
  vi.clearAllMocks()
})

/**
 * El panel ya NO tiene una bandeja con pestañas ("Te toca"/"Esperando"): esa sección se
 * eliminó. Ahora SIEMPRE muestra el resumen de cuenta + "Tus archivos en custodia",
 * tengas 0 órdenes o varias — es una sola pantalla, no dos que alternan según el conteo.
 */
describe('PanelPage', () => {
  it('sin órdenes muestra el resumen de cuenta con el @usuario del usuario', () => {
    useOrdersMock.mockReturnValue({ orders: [], isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    expect(screen.getByText(/Tu cuenta está lista/)).toBeInTheDocument()
    expect(screen.getByTestId('mi-handle')).toHaveTextContent('@trq-925j')
  })

  it('subir archivo es la única acción, sin barra fija duplicada', () => {
    useOrdersMock.mockReturnValue({ orders: [], isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    // Subir archivo es la acción: navega a crear la orden.
    expect(screen.getByRole('link', { name: /Subir archivo para vender/ })).toHaveAttribute(
      'href',
      '/panel/nueva',
    )
    // Y es la ÚNICA del contenido: las otras dos tarjetas son informativas, no enlaces.
    // Se acota al <main> porque el header aporta los suyos (marca y avatar).
    expect(within(screen.getByRole('main')).getAllByRole('link')).toHaveLength(1)
  })

  it('con órdenes tampoco muestra pestañas ni tarjetas de orden: solo el resumen', () => {
    useOrdersMock.mockReturnValue({ orders: ORDENES_DE_EJEMPLO, isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    expect(screen.getByText(/Tu cuenta está lista/)).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Esperando/ })).not.toBeInTheDocument()
    expect(screen.queryByTestId('order-card-4821')).not.toBeInTheDocument()
  })

  it('con órdenes de venta abiertas, la grilla las muestra', () => {
    useOrdersMock.mockReturnValue({ orders: ORDENES_DE_EJEMPLO, isLoading: false })
    renderConWrappers(<PanelPage />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel' })

    // 4821 y 4840 son ventas propias abiertas en los fixtures.
    expect(screen.getByText('entrega-final-branding.zip')).toBeInTheDocument()
    expect(screen.getByText('plantillas-notion-pack.zip')).toBeInTheDocument()
  })
})
