import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Clock, Download, FileText, Lock } from 'lucide-react'
import { StateChip } from '../StateChip'
import { OrderStepper } from '../OrderStepper'
import { esMiTurno, type Order } from '../../types'
import { formatearMonto, formatearPeso, tiempoRestante } from '../../utils/format'
import styles from './OrderCard.module.scss'

interface OrderCardProps {
  orden: Order
}

interface AccionSugerida {
  titulo: string
  etiquetaBoton: string
  /** El botón oscuro con icono lima se reserva a la descarga (el momento de éxito). */
  tono: 'accent' | 'oscuro'
}

/**
 * Qué le toca hacer a quien mira, según el estado y su rol.
 * Devuelve null cuando la orden espera a la otra parte: entonces la tarjeta se dibuja
 * compacta y sin botón, para que la bandeja se lea de un vistazo.
 */
function accionDe(orden: Order): AccionSugerida | null {
  if (!esMiTurno(orden)) return null

  const nombre = orden.contraparte.nombre

  switch (orden.estado) {
    case 'EN_CUSTODIA':
      return {
        titulo: `${nombre} dejó el archivo en custodia. Revisa la ficha técnica.`,
        etiquetaBoton: 'Ver ficha',
        tono: 'accent',
      }
    case 'EN_INSPECCION':
      return {
        titulo: 'Revisa la ficha técnica antes de pagar.',
        etiquetaBoton: 'Ver ficha',
        tono: 'accent',
      }
    case 'PAGO_ENVIADO':
      return {
        titulo: `${nombre} cargó el comprobante. Verifica que el dinero llegó.`,
        etiquetaBoton: 'Revisar y liberar',
        tono: 'accent',
      }
    case 'LIBERADO':
      return {
        titulo: 'Liberado. Descárgalo y verifica el hash.',
        etiquetaBoton: 'Descargar',
        tono: 'oscuro',
      }
    default:
      return null
  }
}

export function OrderCard({ orden }: OrderCardProps) {
  const accion = accionDe(orden)
  const esVendedor = orden.rol === 'vendedor'
  const IconoRol = esVendedor ? ArrowUp : ArrowDown

  const faltaParaLiberar = orden.liberaAutomaticaEn
    ? tiempoRestante(orden.liberaAutomaticaEn)
    : null
  const faltaParaPurga = orden.purgaEn ? tiempoRestante(orden.purgaEn) : null

  return (
    <article
      className={`${styles.card} ${accion ? styles.cardActiva : ''}`}
      data-testid={`order-card-${orden.id}`}
    >
      <div className={styles.top}>
        <div className={styles.identidad}>
          <span className={styles.numero}>#{orden.id}</span>
          <span className={styles.rol}>
            <IconoRol size={11} aria-hidden="true" />
            {esVendedor ? 'VENDES' : 'COMPRAS'}
          </span>
          <span className={styles.contraparte}>{orden.contraparte.handle}</span>
        </div>
        <StateChip estado={orden.estado} />
      </div>

      <div className={styles.archivo}>
        <span className={styles.archivoIcono}>
          <FileText size={18} aria-hidden="true" />
        </span>
        <div className={styles.archivoDatos}>
          <span className={styles.archivoNombre}>{orden.archivo.nombre}</span>
          <span className={styles.archivoMeta}>{formatearPeso(orden.archivo.bytes)}</span>
        </div>
        <span className={styles.monto}>{formatearMonto(orden.montoCop)}</span>
      </div>

      {accion ? (
        <>
          <div className={styles.stepperFila}>
            <OrderStepper estado={orden.estado} />
          </div>

          <p className={styles.accionTitulo}>{accion.titulo}</p>

          {faltaParaLiberar && (
            <p className={styles.reloj}>
              <Clock size={13} aria-hidden="true" />
              QUEDAN {faltaParaLiberar.toUpperCase()}
            </p>
          )}

          <Link
            to={`/panel/orden/${orden.id}`}
            className={accion.tono === 'oscuro' ? styles.botonOscuro : styles.botonAccent}
          >
            {accion.tono === 'oscuro' ? (
              <Download size={16} aria-hidden="true" className={styles.iconoSignal} />
            ) : (
              <Lock size={16} aria-hidden="true" />
            )}
            {accion.etiquetaBoton}
          </Link>
        </>
      ) : (
        <p className={styles.espera}>
          {orden.estado === 'PAGO_ENVIADO' && faltaParaLiberar
            ? `Comprobante cargado. Si no libera, se habilita solo en ${faltaParaLiberar}.`
            : `Esperando a ${orden.contraparte.nombre}.`}
          {faltaParaPurga && (
            <span className={styles.purga}> SE PURGA EN {faltaParaPurga.toUpperCase()}</span>
          )}
        </p>
      )}
    </article>
  )
}
