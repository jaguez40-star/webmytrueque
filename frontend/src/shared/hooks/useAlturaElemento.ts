import { useCallback, useSyncExternalStore, type RefObject } from 'react'

/**
 * Alto en píxeles del contenido fijo dentro de un contenedor, medido en vivo con
 * ResizeObserver.
 *
 * 🔴 Mide `ref.current.firstElementChild`, NO `ref.current`. El contenedor es un `<div>`
 * normal que envuelve una barra `position: fixed` (así es como PanelShell la mide sin
 * necesitar un ref dentro de BarraAccion) — y un hijo con posición fija NO le da alto a su
 * contenedor en el flujo normal: el contenedor mide 0px aunque la barra ocupe 81px en
 * pantalla. Medir el propio elemento fijo es la única forma correcta.
 *
 * Con `useSyncExternalStore` y no con `useEffect` + `setState`, por la misma razón que
 * `useMediaQuery`: evita el aviso `react/set-state-in-effect` de oxlint, y es la API que
 * React expone para sincronizarse con algo externo — aquí, el tamaño real que el navegador
 * le da al elemento tras aplicar layout, que no se puede saber durante el render.
 *
 * `activo` existe porque el contenedor puede no estar montado (p. ej. una barra fija que
 * solo aparece en algunas pantallas): en `false`, ni se observa ni se mide.
 */
export function useAlturaElemento(
  contenedorRef: RefObject<HTMLElement | null>,
  activo: boolean,
): number | null {
  const objetivo = useCallback(
    () => contenedorRef.current?.firstElementChild as HTMLElement | null,
    [contenedorRef],
  )

  const suscribir = useCallback(
    (alCambiar: () => void) => {
      const elemento = objetivo()
      if (!activo || !elemento) return () => {}
      const observador = new ResizeObserver(alCambiar)
      observador.observe(elemento)
      return () => observador.disconnect()
    },
    [objetivo, activo],
  )

  const leer = useCallback(() => {
    if (!activo) return null
    return objetivo()?.getBoundingClientRect().height ?? null
  }, [objetivo, activo])

  return useSyncExternalStore(suscribir, leer, () => null)
}
