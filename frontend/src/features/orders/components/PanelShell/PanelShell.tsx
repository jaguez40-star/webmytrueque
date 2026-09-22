import { useRef, type CSSProperties, type ReactNode } from 'react'
import { PanelHeader } from '../PanelHeader'
import { PanelFooter } from '../PanelFooter'
import { useAlturaElemento } from '@/shared/hooks/useAlturaElemento'
import styles from './PanelShell.module.scss'

interface PanelShellProps {
  children: ReactNode
  /** Si se pasa, el header muestra "volver" en lugar de la marca. */
  volverA?: string
  volverTexto?: string
  /** La barra fija de acción, si la pantalla tiene una. */
  barra?: ReactNode
}

/**
 * Armazón común de las pantallas privadas: header + contenido + barra fija opcional.
 *
 * Existe para una cosa concreta: cuando hay barra fija, el contenido DEBE reservar su alto
 * al final o el último elemento queda tapado. Centralizarlo aquí evita que una pantalla se
 * olvide y el bug aparezca solo en un teléfono.
 *
 * 🔴 El alto reservado se MIDE, no se supone. Cada pantalla tiene una barra de contenido
 * distinto (una nota + botón ancho en NuevaOrdenPage, un aviso + Continuar en
 * DetalleOrdenPage) y por tanto de alto distinto. Un solo número fijo en `--alto-barra`
 * quedaba bien para la barra más alta y dejaba un hueco vacío de hasta 59px entre el
 * footer y la barra en las más bajas — parecía que el botón "flotaba" fuera de lugar.
 * Con `useAlturaElemento` (ResizeObserver) el hueco reservado es siempre exacto, para
 * cualquier barra, incluida una que cambie de alto en vivo (la de subir archivo crece
 * cuando aparece la barra de progreso).
 */
export function PanelShell({ children, volverA, volverTexto, barra }: PanelShellProps) {
  const barraRef = useRef<HTMLDivElement>(null)
  const altoBarra = useAlturaElemento(barraRef, Boolean(barra))

  // Mientras no haya medición (primer paint), cae al token estático como respaldo — no
  // deja el hueco a cero, que taparía el footer un instante.
  const estiloConVariable = altoBarra
    ? ({ '--alto-barra-medida': `${altoBarra}px` } as CSSProperties)
    : undefined

  return (
    // La reserva de espacio para la barra fija va en el contenedor, no en el <main>: si
    // fuera solo en el main, la barra taparía el footer, que viene después.
    <div
      className={`${styles.page} ${barra ? styles.conBarra : ''}`}
      style={estiloConVariable}
    >
      <PanelHeader volverA={volverA} volverTexto={volverTexto} />
      <main className={styles.main}>{children}</main>
      <PanelFooter />
      {/* El wrapper es invisible para el layout (sin estilos propios): `position: fixed`
          de la barra no depende de este div, solo sirve para medirla con el ref. */}
      {barra && <div ref={barraRef}>{barra}</div>}
    </div>
  )
}
