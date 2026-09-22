/**
 * Lo que se prueba aquí es la puerta, no la tabla.
 *
 * El backend ya responde 404 a quien no es el administrador; esta pantalla tiene que
 * mostrar ESE 404 tal cual, sin insinuar que existe un panel al que no llegas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { AdminPage } from './AdminPage'
import { NoEsAdminError } from '../services/adminService'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

const obtenerAlmacenamiento = vi.fn()

vi.mock('../services/adminService', async () => {
  const real = await vi.importActual<typeof import('../services/adminService')>(
    '../services/adminService',
  )
  return {
    ...real,
    obtenerAlmacenamiento: () => obtenerAlmacenamiento(),
  }
})

const RESUMEN = {
  discoTotalBytes: 7_000_000_000,
  discoLibreBytes: 2_900_000_000,
  custodiaBytes: 4_404_019,
  ordenes: [
    {
      id: '7',
      estado: 'EN_CUSTODIA',
      vendedor: '@trq-vend',
      comprador: '@trq-comp',
      creadaEn: new Date().toISOString(),
      purgaEn: null,
      bytesEnDisco: 4_404_019,
      archivos: [
        { id: '11', nombre: 'uno.png', bytes: 4_000_000, enDisco: true },
        { id: '12', nombre: 'perdido.png', bytes: 404_019, enDisco: false },
      ],
    },
  ],
  huerfanos: [{ nombre: '9999', bytes: 500, archivos: 1 }],
}

beforeEach(() => {
  obtenerAlmacenamiento.mockReset()
})

describe('AdminPage', () => {
  it('a quien no es admin le dice que la página no existe', async () => {
    obtenerAlmacenamiento.mockRejectedValue(new NoEsAdminError('Esta página no existe.'))
    renderConWrappers(<AdminPage />, { usuario: USUARIO_DE_PRUEBA })

    expect(await screen.findByText('Esta página no existe')).toBeInTheDocument()
    // Ni rastro de lo que habría dentro.
    expect(screen.queryByText(/Disco del servidor/)).not.toBeInTheDocument()
  })

  it('al admin le muestra el disco, las órdenes y los huérfanos', async () => {
    obtenerAlmacenamiento.mockResolvedValue(RESUMEN)
    renderConWrappers(<AdminPage />, { usuario: { ...USUARIO_DE_PRUEBA, esAdmin: true } })

    expect(await screen.findByText('Disco del servidor')).toBeInTheDocument()
    expect(screen.getByText('Órdenes (1)')).toBeInTheDocument()
    expect(screen.getByText('uno.png')).toBeInTheDocument()
    expect(screen.getByText('@trq-vend → @trq-comp')).toBeInTheDocument()
    expect(screen.getByText('carpeta 9999')).toBeInTheDocument()
  })

  it('delata el archivo que está en la base pero no en el disco', async () => {
    obtenerAlmacenamiento.mockResolvedValue(RESUMEN)
    renderConWrappers(<AdminPage />, { usuario: { ...USUARIO_DE_PRUEBA, esAdmin: true } })

    expect(await screen.findByText(/no está en disco/)).toBeInTheDocument()
    // Y no ofrece descargarlo: no hay nada que bajar.
    expect(
      screen.queryByRole('button', { name: 'Descargar perdido.png' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar uno.png' })).toBeInTheDocument()
  })

  it('ningún borrado ocurre al primer clic', async () => {
    obtenerAlmacenamiento.mockResolvedValue(RESUMEN)
    renderConWrappers(<AdminPage />, { usuario: { ...USUARIO_DE_PRUEBA, esAdmin: true } })

    const borrar = await screen.findByRole('button', { name: 'Borrar toda la orden 7' })
    borrar.click()
    expect(
      await screen.findByRole('button', { name: /Confirmar: Borrar toda la orden 7/ }),
    ).toBeInTheDocument()
  })
})
