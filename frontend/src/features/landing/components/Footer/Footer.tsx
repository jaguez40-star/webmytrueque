import { Logo } from '@/shared/components/Logo'
import styles from './Footer.module.scss'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.bar}>
        <Logo variant="footer" />
        <span className={styles.legal}>© 2026 · CUSTODIA CIFRADA · PURGA AL DESCARGAR</span>
      </div>
    </footer>
  )
}
