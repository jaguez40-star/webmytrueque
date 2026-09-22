import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Contexto, LIMITE_BYTES } from './contextoNuevaOrden'

function mismoArchivo(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size
}

function sumarBytes(archivos: File[]): number {
  return archivos.reduce((total, archivo) => total + archivo.size, 0)
}

function formatearPesoLocal(bytes: number): string {
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let valor = bytes
  let i = 0
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024
    i += 1
  }
  const decimales = i <= 1 ? 0 : 1
  return `${valor.toLocaleString('es-CO', { maximumFractionDigits: decimales })} ${unidades[i]}`
}

/**
 * Estado del formulario de nueva orden, compartido.
 *
 * 🔴 Existe porque el botón de envío NO vive dentro del formulario: está en el pie del
 * modal (ModalNuevaOrden) y en la barra fija de la página (NuevaOrdenPage). Sin un
 * contexto, el botón no puede leer los archivos que el usuario eligió, y cada una de las
 * dos pantallas necesitaría su propia copia de la misma lógica.
 */
export function ProveedorNuevaOrden({ children }: { children: ReactNode }) {
  const [archivos, setArchivos] = useState<File[]>([])
  const [comprador, setComprador] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState(0)

  const agregarArchivos = useCallback((nuevos: File[]) => {
    if (nuevos.length === 0) return
    setError(null)
    setArchivos((previos) => {
      // Se ignoran los que ya estaban en vez de rechazar la tanda entera: volver a elegir
      // un archivo ya puesto es lo normal cuando se añaden de dos en dos.
      const sinRepetir = nuevos.filter(
        (nuevo) => !previos.some((previo) => mismoArchivo(previo, nuevo)),
      )
      if (sinRepetir.length === 0) return previos

      const combinados = [...previos, ...sinRepetir]
      if (sumarBytes(combinados) > LIMITE_BYTES) {
        setError(
          `No caben: serían ${formatearPesoLocal(sumarBytes(combinados))} y el máximo es ${formatearPesoLocal(LIMITE_BYTES)}.`,
        )
        return previos
      }
      return combinados
    })
  }, [])

  const quitarArchivo = useCallback((indice: number) => {
    setError(null)
    setArchivos((previos) => previos.filter((_, i) => i !== indice))
  }, [])

  const limpiar = useCallback(() => {
    setArchivos([])
    setComprador('')
    setMonto('')
    setError(null)
    setEnviando(false)
    setProgreso(0)
  }, [])

  const valor = useMemo(
    () => ({
      archivos,
      comprador,
      monto,
      error,
      enviando,
      progreso,
      agregarArchivos,
      quitarArchivo,
      setComprador,
      setMonto,
      setError,
      setEnviando,
      setProgreso,
      limpiar,
    }),
    [archivos, comprador, monto, error, enviando, progreso, agregarArchivos, quitarArchivo, limpiar],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
