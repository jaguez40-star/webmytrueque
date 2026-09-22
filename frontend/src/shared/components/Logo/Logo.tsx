import styles from './Logo.module.scss'

type LogoVariant = 'header' | 'badge' | 'footer' | 'muted'

interface LogoProps {
  /** header: placa oscura + wordmark grande · badge: mini sobre oscuro ·
   *  footer: barras + wordmark claro · muted: barras grises (franja del dinero) */
  variant?: LogoVariant
  /** Si es true no se renderiza el texto, solo las barras. */
  barsOnly?: boolean
}

export function Logo({ variant = 'header', barsOnly = false }: LogoProps) {
  const bars = (
    <span className={styles.bars} aria-hidden="true">
      <span className={styles.barAccent} />
      <span className={styles.barSignal} />
    </span>
  )

  if (variant === 'header') {
    return (
      <a href="#top" className={styles.header}>
        <span className={styles.plate}>{bars}</span>
        <span className={styles.wordmark}>
          MyTrueque<span className={styles.tld}>.shop</span>
        </span>
      </a>
    )
  }

  if (variant === 'badge') {
    return (
      <span className={styles.badge}>
        {bars}
        <span className={styles.badgeText}>MyTrueque</span>
      </span>
    )
  }

  if (variant === 'muted') {
    return <span className={styles.muted}>{bars}</span>
  }

  return (
    <span className={styles.footer}>
      {bars}
      {!barsOnly && <span className={styles.footerText}>MyTrueque.shop</span>}
    </span>
  )
}
