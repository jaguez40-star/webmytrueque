import { Link } from 'react-router-dom'
import { MenuCuenta } from '../MenuCuenta'
import styles from './PanelHeader.module.scss'

interface PanelHeaderProps {
  /** Cuando se pasa, el header muestra "volver" en vez de la marca. */
  volverA?: string
  volverTexto?: string
}

/**
 * Header del panel: la marca (o "volver") a la izquierda y el menú de cuenta a la derecha.
 *
 * El avatar está en TODAS las pantallas, no solo en la bandeja: antes las internas ponían
 * un título ahí y dejaban al usuario sin acceso a su cuenta sin volver atrás. El título
 * sobraba, además, porque cada pantalla ya lo dice en su propio encabezado.
 *
 * 🔴 La marca se dibuja inline y NO se usa `<Logo>`: `Logo variant="header"` renderiza su
 * propio `<a href="#top">`, y meterlo dentro de un `<Link>` produce un `<a>` dentro de otro
 * `<a>` — HTML inválido que React reporta en consola (hallazgo H2, reproducido). Los
 * estilos replican los de la landing para que sea exactamente el mismo logo.
 */
export function PanelHeader({ volverA, volverTexto = 'Órdenes' }: PanelHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {volverA ? (
          <Link to={volverA} className={styles.volver}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {volverTexto}
          </Link>
        ) : (
          <Link to="/panel" className={styles.marca} aria-label="Ir a tus órdenes">
            <span className={styles.placa} aria-hidden="true">
              <span className={styles.barraAcento} />
              <span className={styles.barraSenal} />
            </span>
            <span className={styles.wordmark}>
              MyTrueque<span className={styles.tld}>.shop</span>
            </span>
          </Link>
        )}

        <MenuCuenta />
      </div>
    </header>
  )
}
