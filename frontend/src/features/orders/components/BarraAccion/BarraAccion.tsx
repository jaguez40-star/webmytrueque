import type { ReactNode } from 'react'
import styles from './BarraAccion.module.scss'

interface BarraAccionProps {
  children: ReactNode
  /** Texto pequeño sobre el botón, para contexto o advertencias. */
  nota?: ReactNode
}

/**
 * Barra fija al fondo con la acción principal de la pantalla.
 *
 * Es la decisión central del rediseño móvil: en escritorio la acción vivía en una columna
 * lateral siempre visible, pero al apilarse en un teléfono quedaba enterrada al final del
 * scroll. Aquí está siempre al alcance del pulgar.
 *
 * El `padding-bottom` incluye `--safe-bottom` para no quedar debajo del indicador de inicio
 * de iOS. Quien la usa debe reservar `--alto-barra` al final de su contenido (PanelShell lo
 * hace solo).
 */
export function BarraAccion({ children, nota }: BarraAccionProps) {
  return (
    <div className={styles.barra}>
      <div className={styles.interior}>
        {nota && <p className={styles.nota}>{nota}</p>}
        {children}
      </div>
    </div>
  )
}
