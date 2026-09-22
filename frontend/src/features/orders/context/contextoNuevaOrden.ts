import { createContext, useContext } from 'react'

/** Tope por orden, en bytes. Lo fija el disco del servidor (~3 GB libres), no el diseño. */
export const LIMITE_BYTES = 1024 ** 3

interface EstadoNuevaOrden {
  archivos: File[]
  comprador: string
  monto: string
  error: string | null
  enviando: boolean
  progreso: number
  agregarArchivos: (nuevos: File[]) => void
  quitarArchivo: (indice: number) => void
  setComprador: (valor: string) => void
  setMonto: (valor: string) => void
  setError: (valor: string | null) => void
  setEnviando: (valor: boolean) => void
  setProgreso: (valor: number) => void
  limpiar: () => void
}

export const Contexto = createContext<EstadoNuevaOrden | null>(null)

export function useNuevaOrden(): EstadoNuevaOrden {
  const valor = useContext(Contexto)
  if (valor === null) {
    throw new Error('useNuevaOrden debe usarse dentro de <ProveedorNuevaOrden>')
  }
  return valor
}
