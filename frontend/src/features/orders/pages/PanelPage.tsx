import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { Check, Copy, Plus, Share2, Upload } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import { OrderCard } from '../components/OrderCard'
import { FiltroTurno, type Turno } from '../components/FiltroTurno'
import { GrillaArchivos } from '../components/GrillaArchivos'
import { useOrders } from '../hooks/useOrders'
import { useCompartirUsuario } from '../hooks/useCompartirUsuario'
import { esMiTurno, estaCerrada } from '../types'
import { useAuthStore } from '@/features/auth/store/authStore'
import styles from './PanelPage.module.scss'

export function PanelPage() {
  const user = useAuthStore((state) => state.user)
  const { orders } = useOrders()
  const [turno, setTurno] = useState<Turno>('mio')
  // Se pasa como `state` al navegar a /panel/nueva: le dice a App sobre qué pantalla
  // superponer el modal en escritorio. En teléfono se ignora y la navegación es normal.
  const location = useLocation()

  const abiertas = orders.filter((orden) => !estaCerrada(orden))
  const misTurnos = abiertas.filter(esMiTurno)
  const enEspera = abiertas.filter((orden) => !esMiTurno(orden))
  const visibles = turno === 'mio' ? misTurnos : enEspera

  // Sin órdenes no hay barra fija: la acción vive en la tarjeta "Si vas a vender", que
  // es la única de las tres que hace algo. Tener además un botón fijo que dice lo mismo
  // era repetir el mismo destino dos veces en una pantalla que cabe sin scroll.
  if (orders.length === 0) {
    return (
      <PanelShell>
        <EstadoVacio handle={user?.handle ?? ''} location={location} />
        <GrillaArchivos ordenes={orders} />
      </PanelShell>
    )
  }

  return (
    <PanelShell
      barra={
        <BarraAccion>
          <Link to="/panel/nueva" state={{ background: location }} className={styles.ctaBarra}>
            <Plus size={18} aria-hidden="true" />
            Nueva orden de venta
          </Link>
        </BarraAccion>
      }
    >
      <h1 className={styles.titulo}>Tus órdenes</h1>
      <p className={styles.subtitulo}>Aquí ves de quién es el turno.</p>

      <div className={styles.filtro}>
        <FiltroTurno
          valor={turno}
          onChange={setTurno}
          totalMio={misTurnos.length}
          totalAjeno={enEspera.length}
        />
      </div>

      {visibles.length === 0 ? (
        <p className={styles.sinOrdenes}>
          {turno === 'mio'
            ? 'Nada pendiente de tu lado. Todo está esperando a la otra parte.'
            : 'No hay órdenes esperando a nadie más.'}
        </p>
      ) : (
        <div className={styles.lista}>
          {visibles.map((orden) => (
            <OrderCard key={orden.id} orden={orden} />
          ))}
        </div>
      )}

      <GrillaArchivos ordenes={orders} />
    </PanelShell>
  )
}

/* ───────────────────────── Estado vacío ───────────────────────── */

function EstadoVacio({ handle, location }: { handle: string; location: Location }) {
  return (
    <div className={styles.vacio}>
      <span className={styles.vacioBadge}>
        <span className={styles.vacioPunto} aria-hidden="true" />
        CUENTA CREADA
      </span>

      <h1 className={styles.vacioTitulo}>Tu cuenta está lista. Este es tu @usuario.</h1>
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
 * el estado vacío es una función de render sin hooks propios.
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
