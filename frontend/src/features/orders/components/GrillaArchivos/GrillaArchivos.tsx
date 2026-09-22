import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp, Trash2 } from 'lucide-react'
import { AccionesOrden } from '../AccionesOrden'
import { StateChip } from '../StateChip'
import { usePurgarArchivo } from '../../hooks/usePurgarOrden'
import { estaCerrada, type Order, type OrderFile, type OrderRole } from '../../types'
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
 * equivalentes se veían como dos cosas distintas.
 *
 * 🔴 La tarjeta ya NO es un enlace entero: cada fila de archivo lleva su propia papelera
 * para el vendedor, y un botón dentro de un <a> es HTML inválido además de un clic que
 * acabaría navegando. El acceso al detalle queda como un enlace explícito en el pie.
 */
function TarjetaOrden({ orden, preposicion, rol }: TarjetaProps) {
  const total = orden.archivos.length

  return (
    <li className={styles.tarjeta}>
      <AccionesOrden orden={orden} rol={rol} />
      <div className={styles.tileTop}>
        <span className={styles.extension}>
          {total} {total === 1 ? 'ARCHIVO' : 'ARCHIVOS'}
        </span>
        <StateChip estado={orden.estado} />
      </div>
      <ul className={styles.listaGrupo}>
        {orden.archivos.map((archivo) => (
          <FilaArchivo
            key={archivo.hash}
            orden={orden}
            archivo={archivo}
            puedeBorrar={rol === 'vendedor'}
          />
        ))}
      </ul>
      <div className={styles.pie}>
        <span className={styles.meta}>
          {preposicion} {orden.contraparte.handle}
        </span>
        <Link to={`/panel/orden/${orden.id}`} className={styles.verDetalle}>
          Ver detalle
        </Link>
      </div>
    </li>
  )
}

interface FilaArchivoProps {
  orden: Order
  archivo: OrderFile
  /** Solo el vendedor borra: los archivos son suyos. */
  puedeBorrar: boolean
}

/**
 * Un archivo de la orden. Para el vendedor, con su propia papelera.
 *
 * Borrar uno suelto es lo normal cuando la orden lleva varios y solo uno sobra; purgar la
 * orden entera por eso obligaría a volver a subir el resto. Como en el borrado total, el
 * primer clic solo pregunta: es irreversible y no hay papelera de reciclaje.
 */
function FilaArchivo({ orden, archivo, puedeBorrar }: FilaArchivoProps) {
  const { mutate, isPending, error } = usePurgarArchivo()
  const [confirmando, setConfirmando] = useState(false)
  // Sin id no hay URL que llamar: pasa en los fixtures de demo.
  const borrable = puedeBorrar && Boolean(archivo.id)

  return (
    <li className={styles.filaArchivo}>
      <span className={styles.filaArchivoExt}>
        {archivo.extension.replace('.', '').toUpperCase()}
      </span>
      <span className={styles.filaArchivoNombre}>{archivo.nombre}</span>
      <span className={styles.filaArchivoPeso}>{formatearPeso(archivo.bytes)}</span>

      {borrable &&
        (confirmando ? (
          <span className={styles.filaConfirma}>
            <button
              type="button"
              className={styles.filaBorrarYa}
              // El texto visible es corto porque la fila es estrecha; el nombre accesible
              // dice de qué archivo se trata, que es lo único que importa a ciegas.
              aria-label={`Confirmar borrado de ${archivo.nombre}`}
              disabled={isPending}
              onClick={() => {
                if (archivo.id) mutate({ ordenId: orden.id, archivoId: archivo.id })
              }}
            >
              {isPending ? 'Borrando…' : 'Sí, borrar'}
            </button>
            <button
              type="button"
              className={styles.filaCancelar}
              aria-label={`Cancelar borrado de ${archivo.nombre}`}
              onClick={() => {
                setConfirmando(false)
              }}
            >
              No
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={styles.filaBorrar}
            aria-label={`Borrar ${archivo.nombre}`}
            onClick={() => {
              setConfirmando(true)
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        ))}

      {error && <span className={styles.filaError}>{error.message}</span>}
    </li>
  )
}
