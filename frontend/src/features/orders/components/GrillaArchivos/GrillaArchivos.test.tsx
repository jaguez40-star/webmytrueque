import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { GrillaArchivos } from './GrillaArchivos'
import { ORDENES_DE_EJEMPLO } from '../../data/ordersFixtures'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

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
})
