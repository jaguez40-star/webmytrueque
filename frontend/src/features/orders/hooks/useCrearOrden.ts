import { useMutation, useQueryClient } from '@tanstack/react-query'
import { crearOrden, type DatosNuevaOrden } from '../services/ordersService'
import { CLAVE_ORDENES } from './useOrders'

/**
 * Crea la orden y refresca la bandeja.
 *
 * `alProgresar` se pasa hasta el XHR: es lo que mueve la barra durante la subida.
 */
export function useCrearOrden(alProgresar: (porcentaje: number) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (datos: DatosNuevaOrden) => crearOrden(datos, alProgresar),
    onSuccess: () => {
      // La bandeja tiene que mostrar la orden recién creada al volver al panel.
      void queryClient.invalidateQueries({ queryKey: CLAVE_ORDENES })
    },
  })
}
