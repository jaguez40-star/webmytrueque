/**
 * Tipos del dominio de órdenes.
 *
 * Los estados son una unión de literales y NO un `enum`: `tsconfig.app.json` tiene
 * `erasableSyntaxOnly: true`, que prohíbe `enum` (no es borrable en compilación).
 */

/** Las 6 etapas por las que pasa una orden, en orden. */
export const ORDER_STATES = [
  'EN_CUSTODIA',
  'EN_INSPECCION',
  'PAGO_ENVIADO',
  'LIBERADO',
  'DESCARGADO',
  'PURGADO',
] as const

export type OrderState = (typeof ORDER_STATES)[number]

/** El papel de QUIEN MIRA la pantalla, no el de la contraparte. */
export type OrderRole = 'vendedor' | 'comprador'

export interface OrderFile {
  nombre: string
  extension: string
  /** Tamaño en bytes. Se formatea para mostrar; nunca se muestra crudo. */
  bytes: number
  /** SHA-256 completo, 64 caracteres hex. */
  hash: string
  subidoEn: string
  archivosDentro?: number
}

export interface OrderCounterparty {
  nombre: string
  handle: string
  /** Operaciones completadas, para dar contexto de confianza. */
  operaciones: number
}

export interface OrderReceipt {
  nombre: string
  bytes: number
  cargadoEn: string
}

export interface Order {
  id: string
  estado: OrderState
  rol: OrderRole
  contraparte: OrderCounterparty
  /**
   * Una orden puede llevar VARIOS archivos: el formulario permite elegir más de uno.
   * Las vistas compactas (tarjeta, grilla) no los listan todos — usan
   * `resumenDeArchivos()`, que devuelve un OrderFile sintético que los representa.
   */
  archivos: OrderFile[]
  /** Monto en pesos, sin decimales. */
  montoCop: number
  creadaEn: string
  /**
   * Cuándo se libera sola (regla de las 24 h). Solo tiene valor en `PAGO_ENVIADO`;
   * en el resto de estados es `null`.
   */
  liberaAutomaticaEn: string | null
  /** Cuándo se purga el archivo si la orden no cierra (30 días). */
  purgaEn: string | null
  comprobante: OrderReceipt | null
  /** Dónde le pagan al vendedor. Solo en las órdenes propias. */
  cuentaDeCobro?: string
}

/**
 * De quién es el turno en cada estado.
 *
 * Es la regla que gobierna la bandeja: se agrupa por turno, no por fecha ni por rol.
 * `null` = la orden no espera acción de nadie (ya terminó).
 */
const TURNO_POR_ESTADO: Record<OrderState, OrderRole | null> = {
  EN_CUSTODIA: 'comprador',
  EN_INSPECCION: 'comprador',
  PAGO_ENVIADO: 'vendedor',
  LIBERADO: 'comprador',
  DESCARGADO: null,
  PURGADO: null,
}

/** true si la orden espera una acción de quien está mirando. */
export function esMiTurno(orden: Order): boolean {
  return TURNO_POR_ESTADO[orden.estado] === orden.rol
}

/** true si la orden ya terminó su ciclo. */
export function estaCerrada(orden: Order): boolean {
  return orden.estado === 'DESCARGADO' || orden.estado === 'PURGADO'
}

/** Etiqueta en mayúsculas para los chips, ej. "PAGO ENVIADO". */
export const ETIQUETA_ESTADO: Record<OrderState, string> = {
  EN_CUSTODIA: 'EN CUSTODIA',
  EN_INSPECCION: 'EN INSPECCIÓN',
  PAGO_ENVIADO: 'PAGO ENVIADO',
  LIBERADO: 'LIBERADO',
  DESCARGADO: 'DESCARGADO',
  PURGADO: 'PURGADO',
}

/**
 * Un OrderFile que representa al conjunto, para las vistas donde no cabe una lista.
 *
 * Con un solo archivo devuelve ese mismo. Con varios, inventa un nombre ("3 archivos"),
 * suma los pesos y deja el hash vacío: el hash de un conjunto no significa nada, y
 * mostrar el del primero sería mentir sobre lo que el comprador va a verificar.
 */
export function resumenDeArchivos(orden: Order): OrderFile {
  const archivos = orden.archivos
  if (archivos.length === 1) return archivos[0]

  const primero = archivos[0]
  return {
    nombre: `${archivos.length} archivos`,
    extension: primero?.extension ?? '',
    bytes: archivos.reduce((total, archivo) => total + archivo.bytes, 0),
    hash: '',
    subidoEn: primero?.subidoEn ?? new Date().toISOString(),
    archivosDentro: archivos.length,
  }
}
