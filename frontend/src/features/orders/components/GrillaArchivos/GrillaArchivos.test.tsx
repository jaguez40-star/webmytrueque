import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { GrillaArchivos } from './GrillaArchivos'
import { ORDENES_DE_EJEMPLO } from '../../data/ordersFixtures'
import type { Order } from '../../types'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

const ORDEN_MULTIARCHIVO: Order = {
  id: '9001',
  estado: 'EN_CUSTODIA',
  rol: 'vendedor',
  contraparte: { nombre: 'Bea R.', handle: '@trq-be4r', operaciones: 3 },
  archivos: [
    {
      nombre: 'foto-portada.png',
      extension: '.png',
      bytes: 79_872,
      hash: 'a'.repeat(64),
      subidoEn: new Date().toISOString(),
    },
    {
      // 20 * 1024, exacto: evita depender de cómo redondea el navegador un .5.
      nombre: 'foto-detalle.png',
      extension: '.png',
      bytes: 20_480,
      hash: 'b'.repeat(64),
      subidoEn: new Date().toISOString(),
    },
    {
      nombre: 'ficha-tecnica.pdf',
      extension: '.pdf',
      bytes: 44_032,
      hash: 'c'.repeat(64),
      subidoEn: new Date().toISOString(),
    },
  ],
  montoCop: 50_000,
  creadaEn: new Date().toISOString(),
  liberaAutomaticaEn: null,
  purgaEn: null,
  comprobante: null,
}

describe('GrillaArchivos', () => {
  it('sin archivos explica dónde aparecerán', () => {
    renderConWrappers(<GrillaArchivos ordenes={[]} />, { usuario: USUARIO_DE_PRUEBA })
    expect(screen.getByText(/Aquí aparecerán los archivos que subas/)).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('muestra solo los archivos que uno vende, no los que compra', () => {
    renderConWrappers(<GrillaArchivos ordenes={ORDENES_DE_EJEMPLO} />, {
      usuario: USUARIO_DE_PRUEBA,
    })

    // De los fixtures, las órdenes con rol vendedor son 4821 y 4840.
    expect(screen.getByText('entrega-final-branding.zip')).toBeInTheDocument()
    expect(screen.getByText('plantillas-notion-pack.zip')).toBeInTheDocument()
    // Las de compra no son archivos propios: no van en la grilla.
    expect(screen.queryByText('dataset-clientes-2026.csv')).not.toBeInTheDocument()
    expect(screen.queryByText('masterclass-fotografia.mp4')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('cada archivo lleva a su orden y dice a quién se vende', () => {
    renderConWrappers(<GrillaArchivos ordenes={ORDENES_DE_EJEMPLO} />, {
      usuario: USUARIO_DE_PRUEBA,
    })

    const tile = screen.getByText('entrega-final-branding.zip').closest('a')
    expect(tile).toHaveAttribute('href', '/panel/orden/4821')
    expect(tile).toHaveTextContent('240,4 MB')
    expect(tile).toHaveTextContent('@trq-4f7k')
  })

  it('una orden con varios archivos los lista todos, no los esconde detrás de "N archivos"', () => {
    renderConWrappers(<GrillaArchivos ordenes={[ORDEN_MULTIARCHIVO]} />, {
      usuario: USUARIO_DE_PRUEBA,
    })

    // Nombre, tipo y peso de CADA archivo, visibles sin entrar al detalle.
    expect(screen.getByText('foto-portada.png')).toBeInTheDocument()
    expect(screen.getByText('foto-detalle.png')).toBeInTheDocument()
    expect(screen.getByText('ficha-tecnica.pdf')).toBeInTheDocument()

    const tarjeta = screen.getByText('foto-portada.png').closest('a')
    expect(tarjeta).toHaveAttribute('href', '/panel/orden/9001')
    // Cada tipo de archivo aparece (PNG dos veces, PDF una), como etiqueta por fila.
    expect(screen.getAllByText('PNG')).toHaveLength(2)
    expect(screen.getByText('PDF')).toBeInTheDocument()
    // El peso es el de CADA archivo, no la suma: 79.872 B ≈ 78 KB, no el total agrupado.
    expect(tarjeta).toHaveTextContent('78 KB')
    expect(tarjeta).toHaveTextContent('20 KB')
    expect(tarjeta).toHaveTextContent('43 KB')
    // El comprador se dice UNA sola vez, no repetido por archivo.
    expect(screen.getAllByText(/@trq-be4r/)).toHaveLength(1)
  })
})
