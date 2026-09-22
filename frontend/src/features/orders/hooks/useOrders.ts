/**
 * Punto único desde el que las pantallas obtienen órdenes.
 *
 * Hoy devuelve datos de ejemplo. Cuando exista el backend se reemplaza el cuerpo por un
 * `useQuery` contra `GET /orders` y **ningún componente cambia**: esa es toda la razón de
 * que este hook exista en vez de importar los fixtures desde las pantallas.
 */
import { ORDENES_DE_EJEMPLO } from '../data/ordersFixtures'
import type { Order } from '../types'

const CLAVE_DEMO = 'trueque_demo_ordenes'

/**
 * Lee "?demo=1" UNA sola vez, al cargar el módulo, y lo recuerda en sessionStorage para
 * que sobreviva a la navegación entre rutas.
 *
 * Fuera de todo componente a propósito: es una decisión de arranque, no de montaje.
 * Resolverlo en un useEffect + setState dispara un render en cascada que oxlint marca
 * con `react/set-state-in-effect`.
 */
function resolverModoDemo(): boolean {
  if (typeof window === 'undefined') return false

  const pedido = new URLSearchParams(window.location.search).get('demo')
  try {
    if (pedido === '1') sessionStorage.setItem(CLAVE_DEMO, '1')
    if (pedido === '0') sessionStorage.removeItem(CLAVE_DEMO)
    return sessionStorage.getItem(CLAVE_DEMO) === '1'
  } catch {
    // Modo incógnito o storage bloqueado: el query param solo vale para esta carga.
    return pedido === '1'
  }
}

const MODO_DEMO = resolverModoDemo()

export interface UseOrdersResult {
  orders: Order[]
  isLoading: boolean
}

export function useOrders(): UseOrdersResult {
  // Sin backend todavía: nunca hay carga real. `isLoading` ya está en la firma para que
  // las pantallas manejen ese estado desde hoy y no haya que retocarlas después.
  return {
    orders: MODO_DEMO ? ORDENES_DE_EJEMPLO : [],
    isLoading: false,
  }
}

/** Busca una orden por id. Devuelve undefined si no existe. */
export function useOrder(id: string | undefined): Order | undefined {
  const { orders } = useOrders()
  if (!id) return undefined
  return orders.find((orden) => orden.id === id)
}
