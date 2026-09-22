import { ETIQUETA_ESTADO, type OrderState } from '../../types'
import styles from './StateChip.module.scss'

/**
 * Chip con el estado de la orden. El color comunica urgencia, no categoría:
 * - `activo`  (violeta sólido): el estado está esperando a alguien AHORA.
 * - `listo`   (borde violeta): liberado, la pelota está del otro lado pero sin reloj.
 * - `exito`   (lima): DESCARGADO. El lima está reservado al éxito en todo el producto.
 * - `neutro`  (borde gris): estados en reposo o cerrados.
 */
const VARIANTE_POR_ESTADO: Record<OrderState, 'activo' | 'listo' | 'exito' | 'neutro'> = {
  EN_CUSTODIA: 'neutro',
  EN_INSPECCION: 'activo',
  PAGO_ENVIADO: 'activo',
  LIBERADO: 'listo',
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
