import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purgarOrden } from '../services/ordersService'
import { CLAVE_ORDENES } from './useOrders'

/**
 * Borrar los archivos de una orden.
 *
 * Al terminar invalida la caché: la orden pasa a PURGADO y desaparece de las dos grillas
 * —la del vendedor y la del comprador—, que es justo lo que hay que ver reflejado.
 */
export function usePurgarOrden() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ordenId: string) => purgarOrden(ordenId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_ORDENES })
    },
  })
}
