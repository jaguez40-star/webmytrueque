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

/**
 * El interruptor "Autorizo descarga" del vendedor.
 *
 * Idempotente: manda el estado deseado, no alterna a ciegas — si dos pestañas lo tocan a
 * la vez, las dos acaban en lo mismo en vez de cancelarse entre ellas.
 */
export async function autorizarDescarga(ordenId: string, autorizado: boolean): Promise<Order> {
  const respuesta = await fetch(`${BASE}/orders/${ordenId}/autorizacion`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ autorizado }),
  })
  if (!respuesta.ok) {
    const detalle = await respuesta
      .json()
      .then((c: { detail?: unknown }) => (typeof c.detail === 'string' ? c.detail : null))
      .catch(() => null)
    throw new Error(detalle ?? 'No se pudo cambiar la autorización.')
  }
  return (await respuesta.json()) as Order
}

/**
 * Baja un archivo de la orden al disco del comprador.
 *
 * Va por `fetch` + blob y no por un `<a download>` directo porque la petición necesita la
 * cookie de sesión: en desarrollo el backend está en otro origen (:8000) y una navegación
 * normal no la mandaría.
 */
export async function descargarArchivo(
  ordenId: string,
  archivoId: string,
  nombre: string,
): Promise<void> {
  const respuesta = await fetch(`${BASE}/orders/${ordenId}/archivos/${archivoId}`, {
    credentials: 'include',
  })
  if (!respuesta.ok) {
    if (respuesta.status === 403) throw new Error('El vendedor todavía no autorizó la descarga.')
    throw new Error('No se pudo descargar el archivo.')
  }

  const blob = await respuesta.blob()
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Sin esto el blob se queda en memoria hasta recargar la página.
  URL.revokeObjectURL(url)
}

/**
 * El vendedor borra los archivos de su orden, ahora y para siempre.
 *
 * Solo el vendedor: lo que el comprador tiene en custodia no es suyo, lo tiene disponible
 * hasta los 30 días o hasta que el vendedor lo purgue. El backend responde 404 a cualquier
 * otro, así que esto no es la única defensa, solo la visible.
 */
export async function purgarOrden(ordenId: string): Promise<Order> {
  const respuesta = await fetch(`${BASE}/orders/${ordenId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!respuesta.ok) {
    const detalle = await respuesta
      .json()
      .then((c: { detail?: unknown }) => (typeof c.detail === 'string' ? c.detail : null))
      .catch(() => null)
    throw new Error(detalle ?? 'No se pudieron borrar los archivos.')
  }
  return (await respuesta.json()) as Order
}
