import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.scss'

type ButtonVariant = 'primary' | 'secondary' | 'outline-accent' | 'signal' | 'ghost-dark'
/** sm: header "Entrar" · md: header "Crear cuenta" y botón de demo · lg: submit de
 *  formularios y CTA del bloque oscuro · xl: botón de descarga de la ficha */
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
