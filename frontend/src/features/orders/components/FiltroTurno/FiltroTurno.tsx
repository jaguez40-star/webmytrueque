import styles from './FiltroTurno.module.scss'

export type Turno = 'mio' | 'ajeno'

interface FiltroTurnoProps {
  valor: Turno
  onChange: (turno: Turno) => void
  totalMio: number
  totalAjeno: number
}

/**
 * Segmented control que parte la bandeja en "te toca" / "esperando".
 *
 * En escritorio eran dos secciones apiladas, pero en un teléfono eso son varias pantallas
 * de scroll para llegar a la segunda. Con el filtro, lo urgente se ve sin deslizar.
 */
export function FiltroTurno({ valor, onChange, totalMio, totalAjeno }: FiltroTurnoProps) {
  return (
    <div className={styles.grupo} role="tablist" aria-label="Filtrar órdenes por turno">
      <button
        type="button"
        role="tab"
        aria-selected={valor === 'mio'}
        className={`${styles.opcion} ${valor === 'mio' ? styles.activa : ''}`}
        onClick={() => onChange('mio')}
      >
        Te toca
        <span className={`${styles.contador} ${valor === 'mio' ? styles.contadorActivo : ''}`}>
          {totalMio}
        </span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={valor === 'ajeno'}
        className={`${styles.opcion} ${valor === 'ajeno' ? styles.activa : ''}`}
        onClick={() => onChange('ajeno')}
      >
        Esperando
        <span className={`${styles.contador} ${valor === 'ajeno' ? styles.contadorActivo : ''}`}>
          {totalAjeno}
        </span>
      </button>
    </div>
  )
}
