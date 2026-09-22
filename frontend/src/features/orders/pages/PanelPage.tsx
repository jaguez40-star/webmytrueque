import { Link, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { Check, Copy, Share2, Upload } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { GrillaArchivos } from '../components/GrillaArchivos'
import { useOrders } from '../hooks/useOrders'
import { useCompartirUsuario } from '../hooks/useCompartirUsuario'
import { useAuthStore } from '@/features/auth/store/authStore'
import styles from './PanelPage.module.scss'

/**
 * Pantalla principal del panel.
 *
 * Antes tenía dos layouts distintos: la bienvenida cuando `orders.length === 0`, y una
 * bandeja con pestañas "Te toca"/"Esperando" en cuanto había alguna orden. Se eliminó la
 * bandeja: ahora el panel SIEMPRE muestra el resumen de cuenta + dos grillas — una de lo
 * que vendes y otra de lo que compras —, tengas 0 órdenes o 20.
 *
 * 🔴 Las dos grillas son necesarias: quitar la de compras deja al comprador sin ninguna
 * forma de ver la orden que le llegó (no hay bandeja ni notificación en otro lado).
 */
export function PanelPage() {
  const user = useAuthStore((state) => state.user)
  const { orders } = useOrders()
  // Se pasa como `state` al navegar a /panel/nueva: le dice a App sobre qué pantalla
  // superponer el modal en escritorio. En teléfono se ignora y la navegación es normal.
  const location = useLocation()

  return (
    <PanelShell>
      <ResumenCuenta handle={user?.handle ?? ''} location={location} />
      <GrillaArchivos ordenes={orders} rol="vendedor" />
      <GrillaArchivos ordenes={orders} rol="comprador" />
    </PanelShell>
  )
}

/* ───────────────────────── Resumen de cuenta ───────────────────────── */

function ResumenCuenta({ handle, location }: { handle: string; location: Location }) {
  return (
    <div className={styles.vacio}>
      {/* Ni "CUENTA CREADA" ni "tu cuenta está lista": esto se ve en CADA entrada al
          panel, y anunciar un registro que pasó hace semanas es falso. El titular dice
          qué es este sitio, que sigue siendo cierto la primera vez y la número cien. */}
      <h1 className={styles.vacioTitulo}>
        Comprar y vender archivos, con las dos partes protegidas.
      </h1>
      {/* Las dos reglas del modelo van aquí arriba, no en tarjetas aparte: son el marco
          para leer todo lo demás, no dos opciones entre las que elegir. */}
      <p className={styles.vacioSubtitulo}>
        Aquí no hay catálogo ni perfiles públicos: cada trato es entre dos personas que se
        pasan su @usuario. El dinero tampoco pasa por aquí — las transferencias son
        directas, cuenta a cuenta.
      </p>

      <div className={styles.identidad}>
        <span className={styles.identidadEtiqueta}>TU @USUARIO</span>
        <div className={styles.identidadHandle} data-testid="mi-handle">
          {handle}
        </div>
        <AccionesHandle handle={handle} />
        {/* Comprar no es una acción: es consecuencia de compartir este @usuario. Por eso
            vive dentro de la caja, pegado a lo que hay que pasar. */}
        <p className={styles.identidadNota}>
          Pásaselo a quien te vende y la orden te llega sola. No tienes que hacer nada más.
        </p>
      </div>

      {/* Lo único que se pulsa en esta pantalla. La explicación va DENTRO del botón, para
          que se lea como parte de la misma decisión y no como una tarjeta más. */}
      <Link to="/panel/nueva" state={{ background: location }} className={styles.botonVender}>
        <span className={styles.botonVenderLinea}>
          <Upload size={22} aria-hidden="true" />
          <span className={styles.botonVenderTitulo}>Subir archivo para vender</span>
        </span>
        <span className={styles.botonVenderNota}>
          Dices a qué @usuario se lo vendes. Él ve la ficha técnica antes de pagarte.
        </span>
      </Link>
    </div>
  )
}

/**
 * Copiar y compartir el @usuario. Componente aparte porque necesita el estado del hook, y
 * el resumen de cuenta es una función de render sin hooks propios.
 */
function AccionesHandle({ handle }: { handle: string }) {
  const { copiar, compartir, copiado, puedeCompartir } = useCompartirUsuario(handle)

  return (
    <div className={styles.identidadAcciones}>
      <button type="button" className={styles.identidadBoton} onClick={copiar}>
        {copiado ? (
          <>
            <Check size={17} aria-hidden="true" />
            ¡Copiado!
          </>
        ) : (
          <>
            <Copy size={17} aria-hidden="true" />
            {/* El texto se acorta cuando comparte el sitio con "Compartir": a 360px
                "Copiar mi @usuario" no cabe en media fila. */}
            {puedeCompartir ? 'Copiar' : 'Copiar mi @usuario'}
          </>
        )}
      </button>

      {puedeCompartir && (
        <button type="button" className={styles.identidadBoton} onClick={compartir}>
          <Share2 size={17} aria-hidden="true" />
          Compartir
        </button>
      )}
    </div>
  )
}
