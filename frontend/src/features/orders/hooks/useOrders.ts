/**
 * Punto único desde el que las pantallas obtienen órdenes.
 *
 * El modo demo (`?demo=1`) se conserva: sirve para revisar las pantallas sin crear órdenes
 * reales. Cuando está activo NO se llama al backend.
 */
import { useQuery } from '@tanstack/react-query'
import { ORDENES_DE_EJEMPLO } from '../data/ordersFixtures'
import { obtenerOrdenes } from '../services/ordersService'
import type { Order } from '../types'

const CLAVE_DEMO = 'trueque_demo_ordenes'

/** Clave de caché de TanStack Query. Se exporta para poder invalidarla al crear una orden. */
export const CLAVE_ORDENES = ['orders'] as const

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
  const consulta = useQuery({
    queryKey: CLAVE_ORDENES,
    queryFn: obtenerOrdenes,
    // `enabled: false` en modo demo: la consulta no se dispara y devuelve los fixtures.
    enabled: !MODO_DEMO,
    staleTime: 30_000,
  })

  if (MODO_DEMO) return { orders: ORDENES_DE_EJEMPLO, isLoading: false }
  return { orders: consulta.data ?? [], isLoading: consulta.isLoading }
}

/** Busca una orden por id. Devuelve undefined si no existe. */
export function useOrder(id: string | undefined): Order | undefined {
  const { orders } = useOrders()
  if (!id) return undefined
  return orders.find((orden) => orden.id === id)
}
