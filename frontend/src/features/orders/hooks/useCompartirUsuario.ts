import { useCallback, useEffect, useRef, useState } from 'react'

/** Cuánto dura el "¡Copiado!" antes de volver al texto normal. */
const MS_CONFIRMACION = 2000

export interface CompartirUsuario {
  /** Copia el @usuario al portapapeles. */
  copiar: () => void
  /** Abre el menú nativo de compartir; si no existe, copia como alternativa. */
  compartir: () => void
  /** true durante unos segundos tras copiar, para confirmar visualmente. */
  copiado: boolean
  /** true si el dispositivo tiene menú nativo de compartir (casi todos los móviles). */
  puedeCompartir: boolean
}

/**
 * Copiar y compartir el @usuario. Ambas cosas son API del navegador: no hay backend
 * detrás ni hace falta.
 *
 * `navigator.share` abre el selector del sistema (WhatsApp, Telegram, correo…) y existe
 * en Android y iOS, pero NO en buena parte del escritorio. Por eso siempre hay que
 * comprobarlo y dejar una alternativa; aquí, copiar al portapapeles.
 *
 * Ambas API exigen contexto seguro: funcionan en HTTPS y en localhost, no en http a secas.
 */
export function useCompartirUsuario(handle: string): CompartirUsuario {
  const [copiado, setCopiado] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sin esto, cerrar el menú antes de que expire el aviso deja un setState apuntando a un
  // componente ya desmontado.
  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current)
    }
  }, [])

  const copiar = useCallback(() => {
    if (!handle) return
    void navigator.clipboard?.writeText(handle).then(() => {
      setCopiado(true)
      if (temporizador.current) clearTimeout(temporizador.current)
      temporizador.current = setTimeout(() => setCopiado(false), MS_CONFIRMACION)
    })
  }, [handle])

  const compartir = useCallback(() => {
    if (!handle) return

    if (!navigator.share) {
      // Escritorio sin menú nativo: copiar es lo más parecido a "llévatelo".
      copiar()
      return
    }

    void navigator
      .share({
        title: 'Mi @usuario en MyTrueque',
        text: `Mi @usuario en MyTrueque es ${handle}. Pásaselo a quien me venda un archivo y la orden me llega sola.`,
      })
      // Si el usuario cierra el selector, `share` rechaza. No es un error que mostrar.
      .catch(() => {})
  }, [handle, copiar])

  return {
    copiar,
    compartir,
    copiado,
    puedeCompartir: typeof navigator !== 'undefined' && Boolean(navigator.share),
  }
}
