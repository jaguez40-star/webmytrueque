import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purgarArchivo, purgarOrden } from '../services/ordersService'
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

interface VariablesArchivo {
  ordenId: string
  archivoId: string
}

/**
 * Borrar UN archivo de una orden, dejando los demás en custodia.
 *
 * Hook aparte del de la orden entera aunque se parezcan: son dos decisiones distintas
 * —quitar un archivo o cerrar la custodia— y mezclarlas en una mutación con un parámetro
 * opcional haría que la pantalla tuviera que acordarse de cuál está en curso.
 */
export function usePurgarArchivo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ordenId, archivoId }: VariablesArchivo) => purgarArchivo(ordenId, archivoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_ORDENES })
    },
  })
}
