import { Copy, LogOut, Share2 } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations'
import styles from './CuentaPage.module.scss'

/**
 * Pantalla de cuenta.
 *
 * Existe porque en 390px el header no aguanta logo + chip del @usuario + botón de salir
 * (se midieron 32px de desborde horizontal). Todo eso se mudó aquí, a un toque del avatar.
 * De paso, "Cerrar sesión" deja de estar pegado al borde donde se toca por accidente.
 */
export function CuentaPage() {
  const user = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()

  return (
    <PanelShell volverA="/panel" titulo="Tu cuenta">
      <div className={styles.identidad}>
        <span className={styles.etiqueta}>TU @USUARIO</span>
        <div className={styles.handle} data-testid="mi-handle">
          {user?.handle ?? ''}
        </div>
        <p className={styles.texto}>
          Es lo único que compartes para comprar o vender. No hay enlaces públicos ni perfiles
          que alguien pueda buscar.
        </p>
        <div className={styles.acciones}>
          <button type="button" className={styles.botonSignal}>
            <Copy size={17} aria-hidden="true" />
            Copiar
          </button>
          <button type="button" className={styles.botonOscuro}>
            <Share2 size={17} aria-hidden="true" />
            Compartir
          </button>
        </div>
      </div>

      <div className={styles.datos}>
        <div className={styles.dato}>
          <span className={styles.datoEtiqueta}>CORREO</span>
          <span className={styles.datoValor} data-testid="mi-correo">
            {user?.email ?? ''}
          </span>
        </div>
      </div>

      <div className={styles.tarjeta}>
        <h2 className={styles.tarjetaTitulo}>Cómo funciona tu custodia</h2>
        <ul className={styles.lista}>
          <li>Los archivos van cifrados mientras dure la orden.</li>
          <li>Se borran al confirmarse la descarga. Sin copias.</li>
          <li>Si la orden no cierra, se purgan a los 30 días.</li>
          <li>El dinero nunca pasa por MyTrueque.</li>
        </ul>
      </div>

      <button
        type="button"
        className={styles.salir}
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        <LogOut size={18} aria-hidden="true" />
        Cerrar sesión
      </button>
    </PanelShell>
  )
}
