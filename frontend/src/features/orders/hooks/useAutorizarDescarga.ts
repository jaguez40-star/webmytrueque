import { useMutation, useQueryClient } from '@tanstack/react-query'
import { autorizarDescarga } from '../services/ordersService'
import { CLAVE_ORDENES } from './useOrders'

interface Variables {
  ordenId: string
  autorizado: boolean
}

/**
 * El interruptor "Autorizo descarga" del vendedor.
 *
 * Al terminar invalida la caché de órdenes: el estado que importa lo ve la OTRA parte (el
 * botón de descarga del comprador se desbloquea con esto), así que el dato tiene que venir
 * del backend, no quedarse en un estado local de esta pantalla.
 */
export function useAutorizarDescarga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ordenId, autorizado }: Variables) => autorizarDescarga(ordenId, autorizado),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_ORDENES })
    },
  })
}
