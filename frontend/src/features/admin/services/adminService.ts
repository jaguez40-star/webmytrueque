import type { components } from '@/lib/api/schema'

/**
 * Cliente del panel de almacenamiento.
 *
 * Va por `fetch` y no por el cliente tipado porque aquí importa el CÓDIGO de la respuesta:
 * un 404 no es "algo salió mal", es "esta pantalla no existe para ti", y la página tiene
 * que poder distinguirlo de un fallo de red.
 */
const BASE = import.meta.env.PROD ? '' : 'http://localhost:8000'

export type Almacenamiento = components['schemas']['AlmacenamientoOut']
export type OrdenAdmin = components['schemas']['OrdenAdminOut']
export type ArchivoAdmin = components['schemas']['ArchivoAdminOut']
export type Huerfano = components['schemas']['HuerfanoOut']

/** Se lanza cuando el backend dice 404: quien pregunta no es el administrador. */
export class NoEsAdminError extends Error {}

async function pedir(url: string, metodo: 'GET' | 'DELETE'): Promise<Almacenamiento> {
  const respuesta = await fetch(`${BASE}${url}`, { method: metodo, credentials: 'include' })
  if (respuesta.status === 404 || respuesta.status === 401) {
    throw new NoEsAdminError('Esta página no existe.')
  }
  if (!respuesta.ok) {
    const detalle = await respuesta
      .json()
      .then((c: { detail?: unknown }) => (typeof c.detail === 'string' ? c.detail : null))
      .catch(() => null)
    throw new Error(detalle ?? 'No se pudo completar la operación.')
  }
  return (await respuesta.json()) as Almacenamiento
}

export function obtenerAlmacenamiento(): Promise<Almacenamiento> {
  return pedir('/admin/almacenamiento', 'GET')
}

/** Todas las operaciones de borrado devuelven el resumen ya recalculado. */
export function borrarOrden(ordenId: string): Promise<Almacenamiento> {
  return pedir(`/admin/ordenes/${ordenId}`, 'DELETE')
}

export function borrarArchivo(ordenId: string, archivoId: string): Promise<Almacenamiento> {
  return pedir(`/admin/ordenes/${ordenId}/archivos/${archivoId}`, 'DELETE')
}

export function borrarHuerfano(nombre: string): Promise<Almacenamiento> {
  return pedir(`/admin/huerfanos/${nombre}`, 'DELETE')
}

/**
 * Baja algo al disco de quien mira.
 *
 * Por `fetch` + blob y no por un `<a download>`: en desarrollo el backend está en otro
 * origen (:8000) y una navegación normal no mandaría la cookie de sesión.
 */
async function descargar(url: string, nombre: string): Promise<void> {
  const respuesta = await fetch(`${BASE}${url}`, { credentials: 'include' })
  if (!respuesta.ok) throw new Error('No se pudo descargar.')

  const blob = await respuesta.blob()
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(blob)
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(enlace.href)
}

export function descargarOrdenZip(ordenId: string): Promise<void> {
  return descargar(`/admin/ordenes/${ordenId}/zip`, `orden-${ordenId}.zip`)
}

export function descargarArchivoAdmin(
  ordenId: string,
  archivoId: string,
  nombre: string,
): Promise<void> {
  return descargar(`/admin/ordenes/${ordenId}/archivos/${archivoId}`, nombre)
}
