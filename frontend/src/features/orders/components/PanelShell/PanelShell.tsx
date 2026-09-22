import type { ReactNode } from 'react'
import { PanelHeader } from '../PanelHeader'
import { PanelFooter } from '../PanelFooter'
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
 * Armazón común de las 4 pantallas privadas: header + contenido + barra fija opcional.
 *
 * Existe para una cosa concreta: cuando hay barra fija, el contenido DEBE reservar su alto
 * al final o el último elemento queda tapado. Centralizarlo aquí evita que una pantalla se
 * olvide y el bug aparezca solo en un teléfono.
 */
export function PanelShell({
  children,
  volverA,
  volverTexto,
  barra,
}: PanelShellProps) {
  return (
    // La reserva de espacio para la barra fija va en el contenedor, no en el <main>: si
    // fuera solo en el main, la barra taparía el footer, que viene después.
    <div className={`${styles.page} ${barra ? styles.conBarra : ''}`}>
      <PanelHeader volverA={volverA} volverTexto={volverTexto} />
      <main className={styles.main}>{children}</main>
      <PanelFooter />
      {barra}
    </div>
  )
}
