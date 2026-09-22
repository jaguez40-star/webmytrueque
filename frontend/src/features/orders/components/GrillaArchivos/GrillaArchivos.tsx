import { Link } from 'react-router-dom'
import { FileUp } from 'lucide-react'
import { StateChip } from '../StateChip'
import { estaCerrada, type Order } from '../../types'
import { formatearPeso } from '../../utils/format'
import styles from './GrillaArchivos.module.scss'

interface GrillaArchivosProps {
  ordenes: Order[]
}

/**
 * Los archivos que el usuario tiene metidos en la plataforma ahora mismo.
 *
 * NO es un catálogo: aquí no hay nada publicado ni descubrible. Cada tile es el archivo de
 * una orden propia con comprador ya asignado — o sea, es otra forma de mirar lo que la
 * bandeja ya muestra, pero organizada por archivo en vez de por turno. Se deriva de las
 * órdenes, así que no hace falta estado nuevo: un archivo existe si existe su orden.
 */
export function GrillaArchivos({ ordenes }: GrillaArchivosProps) {
  // Solo lo que uno vende y sigue vivo: lo purgado ya no está en ningún servidor.
  const enCustodia = ordenes.filter(
    (orden) => orden.rol === 'vendedor' && !estaCerrada(orden),
  )

  return (
    <section className={styles.seccion}>
      <div className={styles.cabecera}>
        <h2 className={styles.titulo}>Tus archivos en custodia</h2>
        {enCustodia.length > 0 && (
          <span className={styles.contador}>{enCustodia.length}</span>
        )}
      </div>

      {enCustodia.length === 0 ? (
        <div className={styles.vacia}>
          <span className={styles.vaciaIcono}>
            <FileUp size={20} aria-hidden="true" />
          </span>
          <p className={styles.vaciaTexto}>
            Aquí aparecerán los archivos que subas a vender, con el estado de cada orden.
          </p>
        </div>
      ) : (
        <ul className={styles.grilla}>
          {enCustodia.map((orden) =>
            orden.archivos.length > 1 ? (
              <TarjetaAgrupada key={orden.id} orden={orden} />
            ) : (
              <TarjetaArchivo key={orden.id} orden={orden} />
            ),
          )}
        </ul>
      )}
    </section>
  )
}

/** Una orden con un solo archivo: el tile compacto de siempre, extensión + nombre + peso. */
function TarjetaArchivo({ orden }: { orden: Order }) {
  const archivo = orden.archivos[0]
  if (!archivo) return null

  return (
    <li>
      <Link to={`/panel/orden/${orden.id}`} className={styles.tile}>
        <div className={styles.tileTop}>
          <span className={styles.extension}>
            {archivo.extension.replace('.', '').toUpperCase()}
          </span>
          <StateChip estado={orden.estado} />
        </div>
        <span className={styles.nombre}>{archivo.nombre}</span>
        <span className={styles.meta}>
          {formatearPeso(archivo.bytes)} · para {orden.contraparte.handle}
        </span>
      </Link>
    </li>
  )
}

/**
 * Una orden con varios archivos: ocupa la fila entera (no un tile pequeño) y lista cada
 * archivo por separado — nombre, tipo y peso individuales, que es justo lo que un tile de
 * "3 archivos" sin más detalle escondía. El comprador se muestra una sola vez, al pie: es
 * el mismo para todos los archivos de la orden.
 */
function TarjetaAgrupada({ orden }: { orden: Order }) {
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
        <span className={styles.meta}>para {orden.contraparte.handle}</span>
      </Link>
    </li>
  )
}
