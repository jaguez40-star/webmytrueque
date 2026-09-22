import { useId } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import styles from './TextField.module.scss'

interface TextFieldProps extends ComponentPropsWithRef<'input'> {
  label: string
  /** Nodo opcional alineado a la derecha de la etiqueta (ej. "¿La olvidaste?"). */
  labelAction?: ReactNode
  error?: string
}

export function TextField({ label, labelAction, error, id, ref, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <label className={styles.field} htmlFor={inputId}>
      <span className={styles.labelRow}>
        {label}
        {labelAction}
      </span>
      <input
        id={inputId}
        ref={ref}
        className={error ? `${styles.input} ${styles.inputError}` : styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </label>
  )
}
