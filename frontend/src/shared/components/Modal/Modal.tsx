import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './Modal.module.scss'

interface ModalProps {
  /** Texto del encabezado; también da nombre accesible al diálogo. */
  titulo: string
  /** Frase corta bajo el título. Opcional. */
  subtitulo?: string
  children: ReactNode
  /** Pie fijo del modal (botones de acción). Opcional. */
  pie?: ReactNode
  onCerrar: () => void
}

/**
 * Modal accesible construido sobre el `<dialog>` nativo.
 *
 * 🔴 Se usa `showModal()` y no un `<div>` con overlay a propósito: el navegador aporta el
 * atrapado del foco, el cierre con Escape, el `::backdrop` y deja inerte el resto de la
 * página. Escribir un focus trap a mano es una de las fuentes más habituales de fallos de
 * accesibilidad, y aquí no hace falta.
 *
 * Lo que `showModal()` NO hace, y por eso está resuelto aquí: bloquear el scroll de la
 * página de detrás, y devolver el foco al cerrar.
 */
export function Modal({ titulo, subtitulo, children, pie, onCerrar }: ModalProps) {
  const dialogoRef = useRef<HTMLDialogElement>(null)
  // Un id por instancia. El `<dialog>` toma su nombre accesible de aquí, y un id escrito a
  // mano colisionaría en cuanto hubiera dos modales montados a la vez.
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = dialogoRef.current
    if (!dialogo) return

    // Quién tenía el foco antes de abrir, para devolvérselo al cerrar. El navegador lo hace
    // solo cuando el diálogo se cierra con `close()`, pero aquí se cierra desmontándose al
    // navegar, así que el foco acabaría en `<body>` y quien use teclado tendría que
    // retabular desde el principio de la página.
    const previo = document.activeElement as HTMLElement | null

    // `showModal` falla si ya está abierto (p. ej. tras un re-render en StrictMode).
    if (!dialogo.open) dialogo.showModal()

    const desbordeOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = desbordeOriginal
      if (dialogo.open) dialogo.close()
      // `document.contains` porque el disparador pudo desmontarse mientras tanto.
      if (previo && document.contains(previo)) previo.focus()
    }
  }, [])

  // Escape dispara "cancel": se intercepta para que el cierre pase siempre por onCerrar
  // (que además navega hacia atrás) en vez de dejar el diálogo cerrado y la ruta abierta.
  function alCancelar(evento: React.SyntheticEvent<HTMLDialogElement>) {
    evento.preventDefault()
    onCerrar()
  }

  // Pulsar el fondo: el click cae sobre el propio <dialog>, no sobre su contenido.
  function alPulsar(evento: React.MouseEvent<HTMLDialogElement>) {
    if (evento.target === dialogoRef.current) onCerrar()
  }

  return (
    <dialog
      ref={dialogoRef}
      className={styles.dialogo}
      onCancel={alCancelar}
      onClick={alPulsar}
      aria-labelledby={idTitulo}
    >
      <div className={styles.panel}>
        <div className={styles.cabecera}>
          <div className={styles.textos}>
            <h2 className={styles.titulo} id={idTitulo}>
              {titulo}
            </h2>
            {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
          </div>
          <button
            type="button"
            className={styles.cerrar}
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.cuerpo}>{children}</div>

        {pie && <div className={styles.pie}>{pie}</div>}
      </div>
    </dialog>
  )
}
