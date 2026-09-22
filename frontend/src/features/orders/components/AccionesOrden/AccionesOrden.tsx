import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Loader2 } from 'lucide-react'
import { CLAVE_ORDENES } from '../../hooks/useOrders'
import { useAutorizarDescarga } from '../../hooks/useAutorizarDescarga'
import { descargarArchivo } from '../../services/ordersService'
import type { Order, OrderRole } from '../../types'
import styles from './AccionesOrden.module.scss'

interface AccionesOrdenProps {
  orden: Order
  rol: OrderRole
}

/** true si el vendedor ya dio luz verde. DESCARGADO cuenta: ya pasó por LIBERADO. */
function estaAutorizada(orden: Order): boolean {
  return orden.estado === 'LIBERADO' || orden.estado === 'DESCARGADO'
}

/**
 * El pie de cada tarjeta de la grilla: la única acción que cabe ahí.
 *
 * Las dos caras del mismo permiso — el vendedor lo concede con el switch, el comprador lo
 * consume con el botón — por eso viven en el mismo archivo: si una cambia, la otra también.
 */
export function AccionesOrden({ orden, rol }: AccionesOrdenProps) {
  return rol === 'vendedor' ? <SwitchAutorizacion orden={orden} /> : <BotonDescarga orden={orden} />
}

/**
 * "Autorizo Descarga!": abre y cierra la descarga del comprador.
 *
 * Se bloquea en cuanto el comprador descargó: a esas alturas revocar no devuelve el
 * archivo — ya lo tiene — y el botón prometería un control que no existe. El backend
 * responde 409 en ese caso, así que esto no es la única defensa, solo la visible.
 */
function SwitchAutorizacion({ orden }: { orden: Order }) {
  const { mutate, isPending, error } = useAutorizarDescarga()
  const autorizado = estaAutorizada(orden)
  const yaDescargo = Boolean(orden.descargadoEn)

  return (
    <div className={styles.bloque}>
      <label className={styles.switch}>
        <span className={styles.etiqueta}>Autorizo Descarga!</span>
        <span className={styles.control}>
          <input
            type="checkbox"
            role="switch"
            className={styles.input}
            checked={autorizado}
            disabled={isPending || yaDescargo}
            onChange={(evento) =>
              { mutate({ ordenId: orden.id, autorizado: evento.target.checked }) }
            }
          />
          <span className={styles.pista} aria-hidden="true">
            <span className={styles.bolita} />
          </span>
          <span className={styles.valor} aria-hidden="true">
            {autorizado ? 'SÍ' : 'NO'}
          </span>
        </span>
      </label>

      {yaDescargo && <span className={styles.nota}>El comprador ya descargó</span>}
      {error && <span className={styles.error}>{error.message}</span>}
    </div>
  )
}

/**
 * "Descarga de files": baja los archivos de la orden, uno por uno.
 *
 * Inactivo mientras el vendedor no autorice. No se arma un ZIP: cada archivo llega con su
 * nombre original, que es lo que el comprador va a verificar contra el hash.
 */
function BotonDescarga({ orden }: { orden: Order }) {
  const queryClient = useQueryClient()
  const [bajando, setBajando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const autorizado = estaAutorizada(orden)
  // Los fixtures de demo no traen id: sin él no hay URL de descarga que armar.
  const descargables = orden.archivos.flatMap((archivo) =>
    archivo.id ? [{ id: archivo.id, nombre: archivo.nombre }] : [],
  )
  const habilitado = autorizado && descargables.length > 0 && !bajando

  async function alPulsar() {
    setBajando(true)
    setError(null)
    try {
      for (const archivo of descargables) {
        await descargarArchivo(orden.id, archivo.id, archivo.nombre)
      }
      // La primera descarga marca la orden en el backend y congela el switch del vendedor.
      void queryClient.invalidateQueries({ queryKey: CLAVE_ORDENES })
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo descargar.')
    } finally {
      setBajando(false)
    }
  }

  return (
    <div className={styles.bloque}>
      <button
        type="button"
        className={styles.boton}
        disabled={!habilitado}
        onClick={() => void alPulsar()}
      >
        {bajando ? (
          <Loader2 size={15} aria-hidden="true" className={styles.girando} />
        ) : (
          <Download size={15} aria-hidden="true" />
        )}
        Descarga de files
      </button>

      {!autorizado && <span className={styles.nota}>El vendedor aún no autoriza</span>}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
