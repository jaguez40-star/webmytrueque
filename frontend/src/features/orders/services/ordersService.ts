import { apiClient } from '@/lib/api/client'
import type { Order } from '../types'

const BASE = import.meta.env.PROD ? '' : 'http://localhost:8000'

export interface DatosNuevaOrden {
  archivos: File[]
  comprador: string
  monto: string
}

/**
 * Crea la orden subiendo los archivos.
 *
 * 🔴 Usa XMLHttpRequest y NO `fetch` ni `openapi-fetch` a propósito: es la única API del
 * navegador que reporta progreso de subida (`upload.onprogress`). Con un tope de 1 GB,
 * un `fetch` deja la pantalla congelada varios minutos sin señal de vida.
 */
export function crearOrden(
  datos: DatosNuevaOrden,
  alProgresar: (porcentaje: number) => void,
): Promise<Order> {
  return new Promise((resolver, rechazar) => {
    const cuerpo = new FormData()
    cuerpo.append('comprador', datos.comprador)
    cuerpo.append('monto', datos.monto)
    for (const archivo of datos.archivos) cuerpo.append('archivos', archivo)

    const peticion = new XMLHttpRequest()
    peticion.open('POST', `${BASE}/orders`)
    peticion.withCredentials = true // manda la cookie de sesión httpOnly

    peticion.upload.onprogress = (evento) => {
      if (evento.lengthComputable) {
        alProgresar(Math.round((evento.loaded / evento.total) * 100))
      }
    }

    peticion.onload = () => {
      if (peticion.status === 201) {
        resolver(JSON.parse(peticion.responseText) as Order)
        return
      }
      rechazar(new Error(mensajeDeError(peticion)))
    }

    peticion.onerror = () =>
      rechazar(new Error('No se pudo conectar con el servidor. ¿Está corriendo el backend?'))
    peticion.onabort = () => rechazar(new Error('Subida cancelada.'))

    peticion.send(cuerpo)
  })
}

/** FastAPI manda el motivo en `detail`; si no se puede leer, se cae a un genérico. */
function mensajeDeError(peticion: XMLHttpRequest): string {
  try {
    const cuerpo = JSON.parse(peticion.responseText) as { detail?: unknown }
    if (typeof cuerpo.detail === 'string') return cuerpo.detail
  } catch {
    // respuesta no-JSON (502 de un proxy, por ejemplo)
  }
  if (peticion.status === 401) return 'Tu sesión expiró. Vuelve a entrar.'
  return 'No se pudo crear la orden. Inténtalo de nuevo.'
}

/** Las órdenes del usuario en sesión. Esta sí va por el cliente tipado. */
export async function obtenerOrdenes(): Promise<Order[]> {
  const { data, error } = await apiClient.GET('/orders')
  if (error || !data) return []
  return data as unknown as Order[]
}
