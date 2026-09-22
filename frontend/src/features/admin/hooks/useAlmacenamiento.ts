import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  borrarArchivo,
  borrarHuerfano,
  borrarOrden,
  NoEsAdminError,
  obtenerAlmacenamiento,
  type Almacenamiento,
} from '../services/adminService'

const CLAVE = ['admin', 'almacenamiento'] as const

export function useAlmacenamiento() {
  return useQuery({
    queryKey: CLAVE,
    queryFn: obtenerAlmacenamiento,
    // Sin reintentos ante un 404: no es un fallo pasajero, es que esta cuenta no manda.
    retry: (intentos, error) => !(error instanceof NoEsAdminError) && intentos < 2,
    // El disco cambia por detrás cada vez que alguien sube algo: no vale cachearlo mucho.
    staleTime: 5_000,
  })
}

/**
 * Las tres formas de borrar, con la misma mecánica.
 *
 * Cada endpoint devuelve el resumen ya recalculado, así que se escribe directo en la
 * caché en vez de invalidar y volver a pedir: una petición menos y la pantalla no
 * parpadea entre "borrando" y "ya está".
 */
function useBorrado<T>(accion: (argumento: T) => Promise<Almacenamiento>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accion,
    onSuccess: (resumen) => {
      queryClient.setQueryData(CLAVE, resumen)
    },
  })
}

export function useBorrarOrden() {
  return useBorrado((ordenId: string) => borrarOrden(ordenId))
}

export function useBorrarArchivo() {
  return useBorrado(({ ordenId, archivoId }: { ordenId: string; archivoId: string }) =>
    borrarArchivo(ordenId, archivoId),
  )
}

export function useBorrarHuerfano() {
  return useBorrado((nombre: string) => borrarHuerfano(nombre))
}
