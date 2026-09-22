import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

// jsdom no implementa showModal/close del <dialog>: se rellenan a mano para poder montar
// el componente. Lo que se prueba aquí es el comportamiento propio, no el del navegador.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function abrir(this: HTMLDialogElement) {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function cerrar(this: HTMLDialogElement) {
      this.open = false
    }
  }
})

function montar(onCerrar = vi.fn()) {
  render(
    <Modal titulo="Vender un archivo" subtitulo="Tres datos" onCerrar={onCerrar} pie={<button type="button">Guardar</button>}>
      <p>Contenido del formulario</p>
    </Modal>,
  )
  return onCerrar
}

describe('Modal', () => {
  it('muestra título, subtítulo, contenido y pie', () => {
    montar()
    expect(screen.getByRole('heading', { name: 'Vender un archivo' })).toBeInTheDocument()
    expect(screen.getByText('Tres datos')).toBeInTheDocument()
    expect(screen.getByText('Contenido del formulario')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('el diálogo toma su nombre accesible del título', () => {
    montar()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Vender un archivo')
  })

  it('la ✕ avisa de que hay que cerrar', async () => {
    const user = userEvent.setup()
    const onCerrar = montar()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('al cerrarse devuelve el foco a quien lo abrió', () => {
    // Sin esto el foco cae en <body> y quien navega con teclado tiene que retabular desde
    // el principio. El navegador solo lo hace cuando el diálogo se cierra con close(); este
    // se cierra desmontándose al navegar.
    const disparador = document.createElement('button')
    disparador.textContent = 'Abrir'
    document.body.appendChild(disparador)
    disparador.focus()
    expect(document.activeElement).toBe(disparador)

    const { unmount } = render(
      <Modal titulo="X" onCerrar={vi.fn()}>
        <p>hola</p>
      </Modal>,
    )
    unmount()

    expect(document.activeElement).toBe(disparador)
    disparador.remove()
  })

  it('bloquea el scroll del body mientras está abierto y lo restaura al cerrarse', () => {
    const { unmount } = render(
      <Modal titulo="X" onCerrar={vi.fn()}>
        <p>hola</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
