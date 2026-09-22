import { useCallback, useSyncExternalStore } from 'react'

/**
 * Media query reactivo.
 *
 * Con `useSyncExternalStore` y no con `useEffect` + `setState` por dos razones: es la API
 * que React expone para suscribirse a fuentes externas (sin parpadeo entre el primer
 * render y el efecto), y evita el aviso `react/set-state-in-effect` de oxlint.
 *
 * El tercer argumento devuelve el valor del servidor: aquí `false`, porque sin ventana no
 * hay ancho que consultar.
 */
export function useMediaQuery(consulta: string): boolean {
  const suscribir = useCallback(
    (alCambiar: () => void) => {
      if (typeof window === 'undefined') return () => {}
      const lista = window.matchMedia(consulta)
      lista.addEventListener('change', alCambiar)
      return () => lista.removeEventListener('change', alCambiar)
    },
    [consulta],
  )

  const leer = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(consulta).matches
  }, [consulta])

  return useSyncExternalStore(suscribir, leer, () => false)
}

/**
 * El umbral del panel para pasar a modal: el mismo 768px del mixin `desde-md`, para que
 * el comportamiento y los estilos cambien a la vez.
 */
export function useEsPantallaAncha(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
