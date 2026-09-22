import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { OrderCard } from './OrderCard'
import type { Order } from '../../types'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

function ordenBase(cambios: Partial<Order> = {}): Order {
  return {
    id: '1001',
    estado: 'PAGO_ENVIADO',
    rol: 'vendedor',
    contraparte: { nombre: 'Ana R.', handle: '@trq-4f7k', operaciones: 17 },
    archivo: {
      nombre: 'archivo-de-prueba.zip',
      extension: '.zip',
      bytes: 252_125_184,
      hash: 'a3f97c2e14b8d0516ff3a9c47e2b8d1069c5a4f3e78b2d91c0a6f5e4b3d2c21b',
      subidoEn: new Date().toISOString(),
    },
    montoCop: 450_000,
    creadaEn: new Date().toISOString(),
    liberaAutomaticaEn: null,
    purgaEn: null,
    comprobante: null,
    ...cambios,
  }
}

describe('OrderCard', () => {
  it('ofrece la acción cuando el turno es del usuario', () => {
    // PAGO_ENVIADO siendo vendedor = le toca liberar.
    renderConWrappers(<OrderCard orden={ordenBase()} />, { usuario: USUARIO_DE_PRUEBA })
    expect(screen.getByRole('link', { name: /Revisar y liberar/ })).toBeInTheDocument()
    expect(screen.getByTestId('state-chip')).toHaveTextContent('PAGO ENVIADO')
  })

  it('no ofrece ninguna acción cuando el turno es de la otra parte', () => {
    // PAGO_ENVIADO siendo comprador = ya pagó, espera a que el vendedor libere.
    renderConWrappers(<OrderCard orden={ordenBase({ rol: 'comprador' })} />, {
      usuario: USUARIO_DE_PRUEBA,
    })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/Esperando a Ana R\./)).toBeInTheDocument()
  })

  it('muestra la contraparte, el monto y el peso legible', () => {
    renderConWrappers(<OrderCard orden={ordenBase()} />, { usuario: USUARIO_DE_PRUEBA })
    expect(screen.getByText('@trq-4f7k')).toBeInTheDocument()
    expect(screen.getByText('$450.000')).toBeInTheDocument()
    // toHaveTextContent sobre la tarjeta y no getByText: el meta del archivo son varios
    // nodos de texto dentro de un mismo elemento, y getByText no atraviesa nodos partidos
    // aunque el texto esté ahí (hallazgo H6).
    expect(screen.getByTestId('order-card-1001')).toHaveTextContent('240,4 MB')
  })
})
