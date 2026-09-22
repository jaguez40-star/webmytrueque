import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspection } from './Inspection'

describe('Inspection', () => {
  it('arranca bloqueada: badge EN INSPECCIÓN y botón deshabilitado', () => {
    render(<Inspection />)
    expect(screen.getByTestId('file-status-badge')).toHaveTextContent('EN INSPECCIÓN')
    expect(screen.getByRole('button', { name: /Descarga bloqueada/ })).toBeDisabled()
  })

  it('al simular la liberación pasa a LIBERADO y habilita la descarga', async () => {
    const user = userEvent.setup()
    render(<Inspection />)
    await user.click(screen.getByRole('button', { name: /Simular: el vendedor libera/ }))
    expect(screen.getByTestId('file-status-badge')).toHaveTextContent('LIBERADO')
    expect(screen.getByRole('button', { name: /Descargar ahora/ })).toBeEnabled()
  })
})
