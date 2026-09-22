import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'
import styles from './PanelHeader.module.scss'

interface PanelHeaderProps {
  /** Cuando se pasa, el header muestra "volver" en vez de la marca. */
  volverA?: string
  volverTexto?: string
  /** Título corto a la derecha (solo con `volverA`). */
  titulo?: string
}

/**
 * Header del panel. 56px en teléfono — 16 menos que el de la landing, que a 390px no deja
 * respirar al contenido.
 *
 * 🔴 La marca se dibuja aquí inline y NO se usa `<Logo>`: `Logo variant="header"` renderiza
 * su propio `<a href="#top">`, y meterlo dentro de un `<Link>` produce un `<a>` dentro de
 * otro `<a>` — HTML inválido que React reporta como error en consola (hallazgo H2, y se
 * reprodujo). Además esta marca es distinta: más pequeña y sin el sufijo ".shop", que a
 * 360px no cabe junto al avatar.
 *
 * El @usuario y "Cerrar sesión" NO viven aquí: se midieron 32px de desborde horizontal a
 * 390px con logo + chip + botón (hallazgo H3). Viven en /panel/cuenta, a un toque del avatar.
 */
export function PanelHeader({ volverA, volverTexto = 'Órdenes', titulo }: PanelHeaderProps) {
  const user = useAuthStore((state) => state.user)
  // Dos últimos caracteres del @usuario: "@trq-925j" -> "9j". Basta para reconocerse.
  const iniciales = user?.handle.slice(-2) ?? '··'

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
            <span className={styles.wordmark}>MyTrueque</span>
          </Link>
        )}

        {titulo ? (
          <span className={styles.titulo}>{titulo}</span>
        ) : (
          <Link to="/panel/cuenta" className={styles.avatarZona} aria-label="Tu cuenta">
            <span className={styles.avatar}>{iniciales}</span>
          </Link>
        )}
      </div>
    </header>
  )
}
