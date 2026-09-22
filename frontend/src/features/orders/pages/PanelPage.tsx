import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Copy, Download, Info, Plus, Upload } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import { OrderCard } from '../components/OrderCard'
import { FiltroTurno, type Turno } from '../components/FiltroTurno'
import { useOrders } from '../hooks/useOrders'
import { esMiTurno, estaCerrada } from '../types'
import { useAuthStore } from '@/features/auth/store/authStore'
import styles from './PanelPage.module.scss'

export function PanelPage() {
  const user = useAuthStore((state) => state.user)
  const { orders } = useOrders()
  const [turno, setTurno] = useState<Turno>('mio')

  const abiertas = orders.filter((orden) => !estaCerrada(orden))
  const misTurnos = abiertas.filter(esMiTurno)
  const enEspera = abiertas.filter((orden) => !esMiTurno(orden))
  const visibles = turno === 'mio' ? misTurnos : enEspera

  if (orders.length === 0) {
    return (
      <PanelShell
        barra={
          <BarraAccion>
            <Link to="/panel/nueva" className={styles.ctaBarra}>
              <Plus size={18} aria-hidden="true" />
              Crear mi primera orden
            </Link>
          </BarraAccion>
        }
      >
        <EstadoVacio handle={user?.handle ?? ''} />
      </PanelShell>
    )
  }

  return (
    <PanelShell
      barra={
        <BarraAccion>
          <Link to="/panel/nueva" className={styles.ctaBarra}>
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
    </PanelShell>
  )
}

/* ───────────────────────── Estado vacío ───────────────────────── */

function EstadoVacio({ handle }: { handle: string }) {
  return (
    <div className={styles.vacio}>
      <span className={styles.vacioBadge}>
        <span className={styles.vacioPunto} aria-hidden="true" />
        CUENTA CREADA
      </span>

      <h1 className={styles.vacioTitulo}>Tu cuenta está lista. Este es tu @usuario.</h1>
      <p className={styles.vacioSubtitulo}>
        Aquí no hay catálogo ni perfiles públicos: cada trato es entre dos personas que se
        pasan su @usuario.
      </p>

      <div className={styles.identidad}>
        <span className={styles.identidadEtiqueta}>TU @USUARIO</span>
        <div className={styles.identidadHandle} data-testid="mi-handle">
          {handle}
        </div>
        <button type="button" className={styles.identidadCopiar}>
          <Copy size={17} aria-hidden="true" />
          Copiar mi @usuario
        </button>
      </div>

      <div className={styles.camino}>
        <span className={styles.caminoIcono}>
          <Download size={18} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.caminoTitulo}>Si vas a comprar</span>
          <p className={styles.caminoTexto}>
            Pásale tu @usuario a quien te vende. La orden llega sola.
          </p>
        </div>
      </div>

      <div className={styles.camino}>
        <span className={styles.caminoIcono}>
          <Upload size={18} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.caminoTitulo}>Si vas a vender</span>
          <p className={styles.caminoTexto}>
            Sube el archivo y di a qué @usuario se lo vendes. Él ve la ficha técnica antes de
            pagarte.
          </p>
        </div>
      </div>

      <div className={styles.camino}>
        <span className={styles.caminoIcono}>
          <Banknote size={18} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.caminoTitulo}>El dinero no pasa por aquí</span>
          <p className={styles.caminoTexto}>
            Las transferencias son directas, cuenta a cuenta.
          </p>
        </div>
      </div>

      <p className={styles.vacioPie}>
        <Info size={15} aria-hidden="true" />
        No tienes que hacer nada más para recibir órdenes.
      </p>
    </div>
  )
}
