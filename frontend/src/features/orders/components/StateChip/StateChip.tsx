import { ETIQUETA_ESTADO, type OrderState } from '../../types'
import styles from './StateChip.module.scss'

/**
 * Chip con el estado de la orden. El color comunica urgencia, no categoría:
 * - `activo`  (violeta sólido): el estado está esperando a alguien AHORA.
 * - `liberado` (lima con borde): el vendedor autorizó, el archivo ya se puede bajar. Es la
 *   luz verde del producto, así que se ve como tal — antes era un borde violeta que no
 *   se distinguía de un estado en reposo.
 * - `exito`   (lima): DESCARGADO, el trato terminado. El lima está reservado al éxito.
 * - `neutro`  (borde gris): estados en reposo o cerrados.
 */
const VARIANTE_POR_ESTADO: Record<OrderState, 'activo' | 'liberado' | 'exito' | 'neutro'> = {
  EN_CUSTODIA: 'neutro',
  EN_INSPECCION: 'activo',
  PAGO_ENVIADO: 'activo',
  LIBERADO: 'liberado',
  DESCARGADO: 'exito',
  PURGADO: 'neutro',
}

interface StateChipProps {
  estado: OrderState
}

export function StateChip({ estado }: StateChipProps) {
  const variante = VARIANTE_POR_ESTADO[estado]
  return (
    <span className={`${styles.chip} ${styles[variante]}`} data-testid="state-chip">
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}
