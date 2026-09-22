/**
 * El permiso de descarga, visto desde los dos lados.
 *
 * Lo que se prueba aquí no es cosmético: si el botón del comprador quedara activo sin
 * autorización, la promesa central del producto —el vendedor manda hasta que decide
 * soltar— dejaría de existir en la pantalla.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GrillaArchivos } from '../GrillaArchivos'
import type { Order, OrderState } from '../../types'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

const autorizarDescarga = vi.fn()
const descargarArchivo = vi.fn()

vi.mock('../../services/ordersService', () => ({
  autorizarDescarga: (...args: unknown[]) => autorizarDescarga(...args),
  descargarArchivo: (...args: unknown[]) => descargarArchivo(...args),
  obtenerOrdenes: () => Promise.resolve([]),
}))

function orden(estado: OrderState, extra: Partial<Order> = {}): Order {
  return {
    id: '7001',
    estado,
    rol: 'vendedor',
    contraparte: { nombre: 'Bea R.', handle: '@trq-be4r', operaciones: 3 },
    archivos: [
      {
        id: '11',
        nombre: 'manual.pdf',
        extension: '.pdf',
        bytes: 20_480,
        hash: 'a'.repeat(64),
        subidoEn: new Date().toISOString(),
      },
    ],
    montoCop: 50_000,
    creadaEn: new Date().toISOString(),
    liberaAutomaticaEn: null,
    purgaEn: null,
    comprobante: null,
    ...extra,
  }
}

beforeEach(() => {
  autorizarDescarga.mockReset().mockResolvedValue(orden('LIBERADO'))
  descargarArchivo.mockReset().mockResolvedValue(undefined)
})

describe('Vendedor — switch "Autorizo Descarga!"', () => {
  it('arranca apagado mientras la orden sigue en custodia', () => {
    renderConWrappers(<GrillaArchivos ordenes={[orden('EN_CUSTODIA')]} rol="vendedor" />, {
      usuario: USUARIO_DE_PRUEBA,
    })

    const interruptor = screen.getByRole('switch', { name: /Autorizo Descarga/ })
    expect(interruptor).not.toBeChecked()
    expect(interruptor).toBeEnabled()
  })

  it('al encenderlo manda la autorización al backend', async () => {
    const usuario = userEvent.setup()
    renderConWrappers(<GrillaArchivos ordenes={[orden('EN_CUSTODIA')]} rol="vendedor" />, {
      usuario: USUARIO_DE_PRUEBA,
    })

    await usuario.click(screen.getByRole('switch', { name: /Autorizo Descarga/ }))

    await waitFor(() => {
      expect(autorizarDescarga).toHaveBeenCalledWith('7001', true)
    })
  })

  it('con la orden liberada el switch ya está encendido', () => {
    renderConWrappers(<GrillaArchivos ordenes={[orden('LIBERADO')]} rol="vendedor" />, {
      usuario: USUARIO_DE_PRUEBA,
    })
    expect(screen.getByRole('switch', { name: /Autorizo Descarga/ })).toBeChecked()
  })

  it('se congela cuando el comprador ya descargó: revocar no devolvería el archivo', () => {
    const descargada = orden('LIBERADO', { descargadoEn: new Date().toISOString() })
    renderConWrappers(<GrillaArchivos ordenes={[descargada]} rol="vendedor" />, {
      usuario: USUARIO_DE_PRUEBA,
    })

    expect(screen.getByRole('switch', { name: /Autorizo Descarga/ })).toBeDisabled()
    expect(screen.getByText('El comprador ya descargó')).toBeInTheDocument()
  })
})

describe('Comprador — botón "Descarga de files"', () => {
  it('está inactivo mientras el vendedor no autorice', () => {
    const compra = orden('EN_CUSTODIA', { rol: 'comprador' })
    renderConWrappers(<GrillaArchivos ordenes={[compra]} rol="comprador" />, {
      usuario: USUARIO_DE_PRUEBA,
    })

    expect(screen.getByRole('button', { name: /Descarga de files/ })).toBeDisabled()
    expect(screen.getByText('El vendedor aún no autoriza')).toBeInTheDocument()
  })

  it('se activa cuando la orden pasa a LIBERADO y baja cada archivo', async () => {
    const usuario = userEvent.setup()
    const compra = orden('LIBERADO', {
      rol: 'comprador',
      archivos: [
        {
          id: '11',
          nombre: 'manual.pdf',
          extension: '.pdf',
          bytes: 20_480,
          hash: 'a'.repeat(64),
          subidoEn: new Date().toISOString(),
        },
        {
          id: '12',
          nombre: 'anexo.csv',
          extension: '.csv',
          bytes: 4_096,
          hash: 'b'.repeat(64),
          subidoEn: new Date().toISOString(),
        },
      ],
    })
    renderConWrappers(<GrillaArchivos ordenes={[compra]} rol="comprador" />, {
      usuario: USUARIO_DE_PRUEBA,
    })

    const boton = screen.getByRole('button', { name: /Descarga de files/ })
    expect(boton).toBeEnabled()
    await usuario.click(boton)

    // Uno por uno, cada archivo con su nombre original: no se arma un ZIP.
    await waitFor(() => {
      expect(descargarArchivo).toHaveBeenCalledTimes(2)
    })
    expect(descargarArchivo).toHaveBeenNthCalledWith(1, '7001', '11', 'manual.pdf')
    expect(descargarArchivo).toHaveBeenNthCalledWith(2, '7001', '12', 'anexo.csv')
  })

  it('el comprador no ve el switch del vendedor', () => {
    const compra = orden('LIBERADO', { rol: 'comprador' })
    renderConWrappers(<GrillaArchivos ordenes={[compra]} rol="comprador" />, {
      usuario: USUARIO_DE_PRUEBA,
    })
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})
