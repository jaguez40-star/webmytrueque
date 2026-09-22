import { describe, it, expect, beforeAll } from 'vitest'
import { screen } from '@testing-library/react'
import { ModalNuevaOrden } from './ModalNuevaOrden'
import { renderConWrappers, USUARIO_DE_PRUEBA } from '@/test/renderConWrappers'

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

describe('ModalNuevaOrden', () => {
  it('lleva dentro los tres pasos del formulario', () => {
    renderConWrappers(<ModalNuevaOrden />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/nueva' })

    expect(screen.getByRole('heading', { name: 'Vender file(s)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Selección' })).toBeInTheDocument()
    expect(screen.getByLabelText('@usuario del comprador')).toBeInTheDocument()
    expect(screen.getByLabelText('Monto en COP')).toBeInTheDocument()
  })

  it('los inputs van a 16px, para que iOS no haga zoom al enfocarlos', () => {
    renderConWrappers(<ModalNuevaOrden />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/nueva' })
    expect(screen.getByLabelText('@usuario del comprador').className).toContain('campo')
    expect(screen.getByLabelText('Monto en COP').className).toContain('campo')
  })

  it('el botón de envío arranca deshabilitado: sin archivos no hay orden', () => {
    renderConWrappers(<ModalNuevaOrden />, { usuario: USUARIO_DE_PRUEBA, ruta: '/panel/nueva' })
    expect(screen.getByRole('button', { name: /Poner en custodia/ })).toBeDisabled()
  })
})
