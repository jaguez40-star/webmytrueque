import { Link } from 'react-router-dom'
import { FileUp } from 'lucide-react'
import { AccionesOrden } from '../AccionesOrden'
import { StateChip } from '../StateChip'
import { estaCerrada, type Order, type OrderRole } from '../../types'
import { formatearPeso } from '../../utils/format'
import styles from './GrillaArchivos.module.scss'

interface GrillaArchivosProps {
  ordenes: Order[]
  /** De qué lado se mira la orden: tus ventas, o tus compras. */
  rol: OrderRole
}

/** Textos que cambian según el rol. El resto del componente es idéntico para los dos. */
const COPY: Record<OrderRole, { titulo: string; vacia: string; preposicion: string }> = {
  vendedor: {
    titulo: 'Tus archivos en custodia',
    vacia: 'Aquí aparecerán los archivos que subas a vender, con el estado de cada orden.',
    preposicion: 'para',
  },
  comprador: {
    titulo: 'Tus compras pendientes',
    vacia: 'Aquí aparecerán los archivos que compres, con el estado de cada orden.',
    preposicion: 'de',
  },
}

/**
 * Las órdenes abiertas de un lado (venta o compra), una tarjeta por orden.
 *
 * NO es un catálogo: aquí no hay nada publicado ni descubrible. Cada tarjeta es una orden
 * propia — se deriva de las órdenes, así que no hace falta estado nuevo: un archivo existe
 * si existe su orden. Se usa dos veces en el panel, una por rol, porque el mismo usuario
 * puede tener ambas cosas a la vez: lo que vende y lo que está comprando.
 */
export function GrillaArchivos({ ordenes, rol }: GrillaArchivosProps) {
  const copy = COPY[rol]
  // Lo abierto de este lado: lo purgado ya no está en ningún servidor.
  const abiertas = ordenes.filter((orden) => orden.rol === rol && !estaCerrada(orden))

  return (
    <section className={styles.seccion}>
      <div className={styles.cabecera}>
        <h2 className={styles.titulo}>{copy.titulo}</h2>
        {abiertas.length > 0 && <span className={styles.contador}>{abiertas.length}</span>}
      </div>

      {abiertas.length === 0 ? (
        <div className={styles.vacia}>
          <span className={styles.vaciaIcono}>
            <FileUp size={20} aria-hidden="true" />
          </span>
          <p className={styles.vaciaTexto}>{copy.vacia}</p>
        </div>
      ) : (
        <ul className={styles.grilla}>
          {abiertas.map((orden) => (
            <TarjetaOrden key={orden.id} orden={orden} preposicion={copy.preposicion} rol={rol} />
          ))}
        </ul>
      )}
    </section>
  )
}

interface TarjetaProps {
  orden: Order
  /** "para" en ventas ("para @comprador"), "de" en compras ("de @vendedor"). */
  preposicion: string
  rol: OrderRole
}

/**
 * Una orden, con TODOS sus archivos listados: nombre, tipo y peso de cada uno.
 *
 * Mismo formato lleve uno o veinte. Antes una orden de un solo archivo caía en un tile
 * estrecho de la grilla y una de varios ocupaba la fila entera, así que dos ventas
 * equivalentes se veían como dos cosas distintas. La acción (autorizar / descargar) va
 * FUERA del enlace: un control interactivo dentro de un <a> es HTML inválido y, en la
 * práctica, un clic en el switch acabaría navegando al detalle.
 */
function TarjetaOrden({ orden, preposicion, rol }: TarjetaProps) {
  const total = orden.archivos.length

  return (
    <li className={styles.tarjeta}>
      <AccionesOrden orden={orden} rol={rol} />
      <Link to={`/panel/orden/${orden.id}`} className={styles.enlace}>
        <div className={styles.tileTop}>
          <span className={styles.extension}>
            {total} {total === 1 ? 'ARCHIVO' : 'ARCHIVOS'}
          </span>
          <StateChip estado={orden.estado} />
        </div>
        <ul className={styles.listaGrupo}>
          {orden.archivos.map((archivo) => (
            <li key={archivo.hash} className={styles.filaArchivo}>
              <span className={styles.filaArchivoExt}>
                {archivo.extension.replace('.', '').toUpperCase()}
              </span>
              <span className={styles.filaArchivoNombre}>{archivo.nombre}</span>
              <span className={styles.filaArchivoPeso}>{formatearPeso(archivo.bytes)}</span>
            </li>
          ))}
        </ul>
        <span className={styles.meta}>
          {preposicion} {orden.contraparte.handle}
        </span>
      </Link>
    </li>
  )
}
