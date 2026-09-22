import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormularioNuevaOrden } from './FormularioNuevaOrden'
import { ProveedorNuevaOrden } from '../../context/ProveedorNuevaOrden'

/**
 * Un File del tamaño que se pida sin reservar esa memoria: `File` toma el tamaño de su
 * contenido, así que para probar el tope de 1 GB se redefine `size`. Crear un archivo de
 * ese tamaño de verdad reventaría el runner.
 */
function archivoDe(nombre: string, bytes: number): File {
  const archivo = new File(['x'], nombre, { type: 'application/octet-stream' })
  Object.defineProperty(archivo, 'size', { value: bytes })
  return archivo
}

const GB = 1024 ** 3

function montar() {
  render(
    <ProveedorNuevaOrden>
      <FormularioNuevaOrden />
    </ProveedorNuevaOrden>,
  )
}

function entradaDeArchivos(): HTMLInputElement {
  const entrada = document.querySelector('input[type="file"]')
  if (!entrada) throw new Error('no hay input de archivos')
  return entrada as HTMLInputElement
}

describe('FormularioNuevaOrden — selección de archivos', () => {
  it('parte sin archivos y anuncia el tope', () => {
    montar()
    expect(screen.getByText(/Hasta 1 GB en total/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar archivo' })).toBeInTheDocument()
  })

  it('acepta varios archivos y muestra el total', async () => {
    const user = userEvent.setup()
    montar()

    await user.upload(entradaDeArchivos(), [
      archivoDe('contrato.pdf', 240 * 1024 ** 2),
      archivoDe('planos.zip', 300 * 1024 ** 2),
    ])

    expect(screen.getByText('contrato.pdf')).toBeInTheDocument()
    expect(screen.getByText('planos.zip')).toBeInTheDocument()
    expect(screen.getByText(/2 archivos · 540 MB de 1 GB/)).toBeInTheDocument()
  })

  it('rechaza la tanda si el TOTAL pasa de 1 GB, no cada archivo por separado', async () => {
    const user = userEvent.setup()
    montar()

    // Ninguno de los dos llega al tope por su cuenta; juntos sí lo pasan.
    await user.upload(entradaDeArchivos(), [archivoDe('a.mov', 0.6 * GB)])
    expect(screen.getByText(/1 archivo · 614,4 MB de 1 GB/)).toBeInTheDocument()

    await user.upload(entradaDeArchivos(), [archivoDe('b.mov', 0.6 * GB)])
    expect(screen.getByRole('alert')).toHaveTextContent(/máximo es 1 GB/)
    // El que ya estaba se conserva: rechazar lo nuevo no puede borrar lo anterior.
    expect(screen.getByText('a.mov')).toBeInTheDocument()
    expect(screen.queryByText('b.mov')).not.toBeInTheDocument()
  })

  it('ignora el mismo archivo elegido dos veces', async () => {
    const user = userEvent.setup()
    montar()

    await user.upload(entradaDeArchivos(), [archivoDe('foto.png', 1024)])
    await user.upload(entradaDeArchivos(), [archivoDe('foto.png', 1024)])

    expect(screen.getAllByText('foto.png')).toHaveLength(1)
    expect(screen.getByText(/1 archivo · 1 KB/)).toBeInTheDocument()
  })

  it('permite quitar un archivo de la lista', async () => {
    const user = userEvent.setup()
    montar()

    await user.upload(entradaDeArchivos(), [
      archivoDe('uno.txt', 2048),
      archivoDe('dos.txt', 1024),
    ])
    await user.click(screen.getByRole('button', { name: 'Quitar uno.txt' }))

    expect(screen.queryByText('uno.txt')).not.toBeInTheDocument()
    expect(screen.getByText('dos.txt')).toBeInTheDocument()
    expect(screen.getByText(/1 archivo · 1 KB/)).toBeInTheDocument()
  })

  it('el campo del comprador es editable, y ya no hay campo de monto', async () => {
    const user = userEvent.setup()
    montar()

    await user.type(screen.getByLabelText('@usuario del comprador'), '@trq-abcd')

    expect(screen.getByLabelText('@usuario del comprador')).toHaveValue('@trq-abcd')
    expect(screen.queryByLabelText('Monto en COP')).not.toBeInTheDocument()
    expect(screen.queryByText(/Cuánto acordaron/)).not.toBeInTheDocument()
  })
})
