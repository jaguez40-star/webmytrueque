import { Copy } from 'lucide-react'
import { hashCorto } from '../../utils/format'
import styles from './HashField.module.scss'

interface HashFieldProps {
  hash: string
  /** Texto explicativo bajo el campo. */
  nota?: string
}

/**
 * Hash SHA-256 abreviado, con botón Copiar y desplegable para verlo completo.
 *
 * Los 64 caracteres volcados ocupan 3 líneas en un teléfono y empujan todo lo demás. Casi
 * nadie los lee: lo que la gente hace es copiarlos y comparar. Por eso el botón Copiar es
 * grande (44px) y el texto completo vive tras un `<details>`, que funciona sin JavaScript
 * y es accesible por teclado de serie.
 */
export function HashField({ hash, nota }: HashFieldProps) {
  return (
    <div className={styles.caja}>
      <div className={styles.fila}>
        <div className={styles.valorZona}>
          <span className={styles.etiqueta}>HASH SHA-256</span>
          <span className={styles.abreviado} data-testid="hash-abreviado">
            {hashCorto(hash)}
          </span>
        </div>
        <button type="button" className={styles.copiar}>
          <Copy size={15} aria-hidden="true" />
          Copiar
        </button>
      </div>

      <details className={styles.desplegable}>
        <summary className={styles.resumen}>Ver hash completo</summary>
        <code className={styles.completo}>{hash}</code>
      </details>

      {nota && <p className={styles.nota}>{nota}</p>}
    </div>
  )
}
