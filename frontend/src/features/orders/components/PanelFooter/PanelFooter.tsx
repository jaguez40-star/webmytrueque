import { Logo } from '@/shared/components/Logo'
import styles from './PanelFooter.module.scss'

/**
 * Pie de las pantallas privadas, réplica del de la landing.
 *
 * Aquí SÍ se reutiliza `<Logo>`: la variante "footer" renderiza un `<span>`, no un `<a>`,
 * así que no hay riesgo de anidar enlaces (a diferencia de la variante "header", que sí es
 * un `<a>` — ver PanelHeader).
 */
export function PanelFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.bar}>
        <Logo variant="footer" />
        <span className={styles.legal}>
          © 2026 MYTRUEQUE.SHOP · TODOS LOS DERECHOS RESERVADOS
        </span>
      </div>
    </footer>
  )
}
