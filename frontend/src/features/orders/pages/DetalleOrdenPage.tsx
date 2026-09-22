import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  FileText,
  Image as ImageIcon,
} from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { StateChip } from '../components/StateChip'
import { HashField } from '../components/HashField'
import { useOrder } from '../hooks/useOrders'
import {
  ORDER_STATES,
  ETIQUETA_ESTADO,
  esMiTurno,
  resumenDeArchivos,
  type Order,
  type OrderState,
} from '../types'
import {
  fechaLegible,
  formatearPeso,
  haceCuanto,
  tiempoRestante,
} from '../utils/format'
import styles from './DetalleOrdenPage.module.scss'

/** Qué significa cada etapa, escrito desde el lado de quien mira. */
function descripcionEtapa(etapa: OrderState, orden: Order): string {
  const otro = orden.contraparte.nombre
  const yoVendo = orden.rol === 'vendedor'

  switch (etapa) {
    case 'EN_CUSTODIA':
      return yoVendo ? 'Subiste el archivo' : `${otro} subió el archivo`
    case 'EN_INSPECCION':
      return yoVendo ? `${otro} revisó la ficha` : 'Revisaste la ficha'
    case 'PAGO_ENVIADO':
      return yoVendo ? 'Comprobante cargado' : 'Cargaste el comprobante'
    case 'LIBERADO':
      return yoVendo ? 'Tú liberas, o se habilita solo' : `${otro} libera, o se habilita solo`
    case 'DESCARGADO':
      return yoVendo ? `${otro} descarga y verifica` : 'Descargas y verificas el hash'
    case 'PURGADO':
      return 'El archivo se borra. Sin copias.'
  }
}

/** Título de la acción pendiente, según el estado. */
function tituloAccion(estado: OrderState): string {
  switch (estado) {
    case 'PAGO_ENVIADO':
      return 'Verifica que el dinero llegó y libera el archivo'
    case 'LIBERADO':
      return 'Descarga el archivo y verifica el hash'
    default:
      return 'Revisa la ficha técnica antes de decidir'
  }
}

export function DetalleOrdenPage() {
  const { id } = useParams<{ id: string }>()
  const orden = useOrder(id)

  // Una orden inexistente (id inventado, o modo demo apagado) vuelve a la bandeja en vez
  // de mostrar una pantalla rota.
  if (!orden) return <Navigate to="/panel" replace />

  const miTurno = esMiTurno(orden)
  const esVendedor = orden.rol === 'vendedor'
  const IconoRol = esVendedor ? ArrowUp : ArrowDown
  const indiceActual = ORDER_STATES.indexOf(orden.estado)
  const falta = orden.liberaAutomaticaEn ? tiempoRestante(orden.liberaAutomaticaEn) : null
  // La orden puede traer varios archivos. La ficha técnica describe el primero; debajo se
  // listan todos, que es lo que el comprador necesita ver antes de pagar.
  const primerArchivo = orden.archivos[0]
  if (!primerArchivo) return <Navigate to="/panel" replace />

  return (
    // Sin barra fija: los botones que vivían aquí ("Continuar"/"Liberar el archivo" y
    // "Reportar un problema") no tenían onClick — eran maqueta a la espera de las
    // transiciones de estado, que siguen fuera de alcance. Un botón que no hace nada es
    // peor que no tenerlo: promete una acción que no existe.
    <PanelShell volverA="/panel">
      <div className={styles.cabecera}>
        <StateChip estado={orden.estado} />
        <span className={styles.rol}>
          <IconoRol size={11} aria-hidden="true" />
          {esVendedor ? 'VENDES A' : 'COMPRAS A'} {orden.contraparte.handle}
        </span>
      </div>

      {miTurno && (
        <section className={styles.accion}>
          <span className={styles.accionEtiqueta}>
            <span className={styles.accionPunto} aria-hidden="true" />
            TE TOCA A TI
          </span>
          <h1 className={styles.accionTitulo}>{tituloAccion(orden.estado)}</h1>
          <p className={styles.accionTexto}>
            {orden.estado === 'PAGO_ENVIADO'
              ? `${orden.contraparte.nombre} cargó el comprobante ${
                  orden.comprobante ? haceCuanto(orden.comprobante.cargadoEn) : ''
                }. Revisa tu banco: el pago es directo y nosotros no lo vemos.`
              : orden.estado === 'LIBERADO'
                ? 'Al confirmar la descarga, el archivo se borra de nuestros servidores. Sin copias.'
                : 'Compara el hash y la ficha con lo que acordaron antes de pagar nada.'}
          </p>
          {falta && (
            <p className={styles.reloj}>
              <Clock size={15} aria-hidden="true" />
              SE LIBERA SOLO EN {falta.toUpperCase()}
            </p>
          )}
        </section>
      )}

      {/* Sin el monto acordado: el formulario dejó de pedirlo, así que aquí solo saldría
          un "$0". El dinero nunca pasó por la plataforma; la cifra era informativa. */}
      <section className={styles.tarjetaMonto}>
        <div className={styles.contraparte}>
          <span className={styles.contraparteNombre}>{orden.contraparte.nombre}</span>
          <span className={styles.contraparteHandle}>{orden.contraparte.handle}</span>
          <span className={styles.contraparteOps}>
            {orden.contraparte.operaciones} operaciones
          </span>
        </div>
      </section>

      <section className={styles.tarjeta}>
        <div className={styles.tarjetaCabeza}>
          <h2 className={styles.tarjetaTitulo}>Ficha técnica</h2>
          <span className={styles.selloVerificable}>
            <Check size={11} aria-hidden="true" />
            VERIFICABLE
          </span>
        </div>

        <div className={styles.archivo}>
          <span className={styles.archivoIcono}>
            <FileText size={19} aria-hidden="true" />
          </span>
          <div className={styles.archivoDatos}>
            <span className={styles.archivoNombre}>{primerArchivo.nombre}</span>
            <span className={styles.archivoFecha}>
              Subido el {fechaLegible(primerArchivo.subidoEn)}
            </span>
          </div>
        </div>

        <dl className={styles.metadatos}>
          <div>
            <dt>EXTENSIÓN</dt>
            <dd>{primerArchivo.extension}</dd>
          </div>
          <div>
            <dt>PESO</dt>
            <dd>{formatearPeso(resumenDeArchivos(orden).bytes)}</dd>
          </div>
          <div>
            <dt>ARCHIVOS</dt>
            <dd>{orden.archivos.length}</dd>
          </div>
        </dl>

        <HashField
          hash={primerArchivo.hash}
          nota={
            esVendedor
              ? `${orden.contraparte.nombre} compara este hash al descargar. Si no coincide, no es el mismo archivo.`
              : 'Compara este hash con el del archivo descargado. Si no coincide, no es el mismo archivo.'
          }
        />

        {orden.archivos.length > 1 && (
          <ul className={styles.listaArchivos}>
            {orden.archivos.map((archivo) => (
              <li key={archivo.hash} className={styles.listaArchivosItem}>
                <span>{archivo.nombre}</span>
                <span>{formatearPeso(archivo.bytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {orden.comprobante && (
        <section className={styles.tarjeta}>
          <h2 className={styles.tarjetaTitulo}>
            {esVendedor
              ? `Comprobante de ${orden.contraparte.nombre}`
              : 'Comprobante que cargaste'}
          </h2>
          <div className={styles.comprobante}>
            <span className={styles.comprobanteIcono}>
              <ImageIcon size={18} aria-hidden="true" />
            </span>
            <div className={styles.comprobanteDatos}>
              <span className={styles.comprobanteNombre}>{orden.comprobante.nombre}</span>
              <span className={styles.comprobanteMeta}>
                {haceCuanto(orden.comprobante.cargadoEn)} ·{' '}
                {formatearPeso(orden.comprobante.bytes)}
              </span>
            </div>
            <button type="button" className={styles.comprobanteVer}>
              Ver
            </button>
          </div>
          <p className={styles.comprobanteNota}>
            Es lo que la otra parte dice haber pagado, no una confirmación nuestra.{' '}
            <strong>Confirma en tu banco.</strong>
          </p>
        </section>
      )}

      <section className={styles.tarjeta}>
        <h2 className={styles.tarjetaTitulo}>Estado de la orden</h2>
        <ol className={styles.linea}>
          {ORDER_STATES.map((etapa, indice) => {
            const recorrida = indice < indiceActual
            const actual = indice === indiceActual
            return (
              <li key={etapa} className={styles.lineaItem}>
                <span
                  className={[
                    styles.lineaPunto,
                    recorrida ? styles.lineaPuntoHecho : '',
                    actual ? styles.lineaPuntoActual : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                />
                <div
                  className={`${styles.lineaCuerpo} ${recorrida ? styles.lineaCuerpoHecho : ''}`}
                >
                  <span
                    className={`${styles.lineaEtiqueta} ${
                      actual ? styles.lineaEtiquetaActual : ''
                    }`}
                  >
                    {ETIQUETA_ESTADO[etapa]}
                    {actual && ' — AHORA'}
                  </span>
                  <span className={styles.lineaTexto}>{descripcionEtapa(etapa, orden)}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {!miTurno && (
        <p className={styles.esperaPie}>
          <Clock size={15} aria-hidden="true" />
          Esperando a {orden.contraparte.nombre}. Te avisamos cuando haya movimiento.
        </p>
      )}

      <Link to="/panel" className={styles.volverPie}>
        Volver a tus órdenes
      </Link>
    </PanelShell>
  )
}
