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
 * Las órdenes abiertas de un lado (venta o compra), como grilla de archivos.
 *
 * NO es un catálogo: aquí no hay nada publicado ni descubrible. Cada tile es el archivo de
 * una orden propia — se deriva de las órdenes, así que no hace falta estado nuevo: un
 * archivo existe si existe su orden. Se usa dos veces en el panel, una por rol, porque el
 * mismo usuario puede tener ambas cosas a la vez: lo que vende y lo que está comprando.
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
          {abiertas.map((orden) =>
            orden.archivos.length > 1 ? (
              <TarjetaAgrupada key={orden.id} orden={orden} preposicion={copy.preposicion} rol={rol} />
            ) : (
              <TarjetaArchivo key={orden.id} orden={orden} preposicion={copy.preposicion} rol={rol} />
            ),
          )}
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

/** Una orden con un solo archivo: el tile compacto de siempre, extensión + nombre + peso. */
function TarjetaArchivo({ orden, preposicion, rol }: TarjetaProps) {
  const archivo = orden.archivos[0]
  if (!archivo) return null

  return (
    // La acción va FUERA del enlace: un botón dentro de un <a> es HTML inválido y, en la
    // práctica, un clic en el switch acabaría navegando al detalle.
    <li className={styles.celda}>
      <Link to={`/panel/orden/${orden.id}`} className={styles.tile}>
        <div className={styles.tileTop}>
          <span className={styles.extension}>
            {archivo.extension.replace('.', '').toUpperCase()}
          </span>
          <StateChip estado={orden.estado} />
        </div>
        <span className={styles.nombre}>{archivo.nombre}</span>
        <span className={styles.meta}>
          {formatearPeso(archivo.bytes)} · {preposicion} {orden.contraparte.handle}
        </span>
      </Link>
      <AccionesOrden orden={orden} rol={rol} />
    </li>
  )
}

/**
 * Una orden con varios archivos: ocupa la fila entera (no un tile pequeño) y lista cada
 * archivo por separado — nombre, tipo y peso individuales, que es justo lo que un tile de
 * "3 archivos" sin más detalle escondía. La contraparte se muestra una sola vez, al pie: es
 * la misma para todos los archivos de la orden.
 */
function TarjetaAgrupada({ orden, preposicion, rol }: TarjetaProps) {
  return (
    <li className={styles.filaAncha}>
      <Link to={`/panel/orden/${orden.id}`} className={styles.tileGrupo}>
        <div className={styles.tileTop}>
          <span className={styles.extension}>{orden.archivos.length} ARCHIVOS</span>
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
      <AccionesOrden orden={orden} rol={rol} />
    </li>
  )
}
