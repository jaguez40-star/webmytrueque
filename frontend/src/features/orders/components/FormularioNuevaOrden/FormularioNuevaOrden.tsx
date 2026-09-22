import { useRef, useState } from 'react'
import { Banknote, Check, FileText, Info, Upload, X } from 'lucide-react'
import { formatearPeso } from '../../utils/format'
import styles from './FormularioNuevaOrden.module.scss'

/**
 * Tope de la custodia: 1 GB contando TODOS los archivos, no cada uno por separado.
 *
 * 🔴 El número lo fija el servidor, no el diseño: el EC2 tiene 6,7 GB de disco con ~3 GB
 * libres. Un tope mayor aceptaría órdenes que la máquina no puede almacenar. Si el disco
 * crece, este es el único sitio que hay que tocar — el copy se genera a partir de aquí.
 */
const LIMITE_BYTES = 1024 ** 3

/** Dos archivos son el mismo si coinciden nombre y tamaño. Evita duplicar al re-elegir. */
function mismoArchivo(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size
}

function sumarBytes(archivos: File[]): number {
  return archivos.reduce((total, archivo) => total + archivo.size, 0)
}

/**
 * Los tres pasos de crear una orden, sin armazón alrededor.
 *
 * Vive aparte de la página porque el mismo marcado se usa en dos sitios: a pantalla
 * completa en teléfono y dentro de un modal en escritorio. Duplicarlo sería garantizar que
 * los dos se desincronicen a la primera corrección de copy.
 *
 * ⚠️ MAQUETA PARCIAL: la selección de archivos es real (se eligen, se miden y se pueden
 * quitar), pero no hay endpoint al que subirlos todavía. El resto de los campos siguen
 * siendo de ejemplo, y el botón de envío vive fuera y tampoco envía nada.
 */
export function FormularioNuevaOrden() {
  const entradaRef = useRef<HTMLInputElement>(null)
  const [archivos, setArchivos] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState(false)

  const total = sumarBytes(archivos)

  function agregar(nuevos: File[]) {
    if (nuevos.length === 0) return

    // Se ignoran los que ya estaban en vez de rechazar la tanda entera: volver a elegir un
    // archivo ya puesto es lo normal cuando se añaden de dos en dos.
    const sinRepetir = nuevos.filter(
      (nuevo) => !archivos.some((previo) => mismoArchivo(previo, nuevo)),
    )
    if (sinRepetir.length === 0) return

    const combinados = [...archivos, ...sinRepetir]
    if (sumarBytes(combinados) > LIMITE_BYTES) {
      setError(
        `No caben: serían ${formatearPeso(sumarBytes(combinados))} y el máximo es ${formatearPeso(LIMITE_BYTES)}.`,
      )
      return
    }

    setError(null)
    setArchivos(combinados)
  }

  function quitar(indice: number) {
    setError(null)
    setArchivos((previos) => previos.filter((_, i) => i !== indice))
  }

  return (
    <>
      {/* ── Paso 1 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>1</span>
          <h3 className={styles.pasoTitulo}>Selección</h3>
        </div>

        {/* El input real queda oculto: lo dispara el botón, que sí es enfocable con
            teclado, y así la zona puede tener el aspecto que pide el diseño. */}
        <input
          ref={entradaRef}
          type="file"
          multiple
          className={styles.entradaOculta}
          onChange={(evento) => {
            agregar(Array.from(evento.target.files ?? []))
            // Se limpia para que volver a elegir el MISMO archivo dispare `change` otra vez.
            evento.target.value = ''
          }}
        />

        <div
          className={`${styles.zonaSubida} ${arrastrando ? styles.zonaActiva : ''}`}
          onDragOver={(evento) => {
            evento.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(evento) => {
            evento.preventDefault()
            setArrastrando(false)
            agregar(Array.from(evento.dataTransfer.files))
          }}
        >
          <span className={styles.zonaIcono}>
            <Upload size={21} aria-hidden="true" />
          </span>
          <p className={styles.zonaTitulo}>Elige el archivo(s) a vender</p>
          <p className={styles.zonaTexto}>
            {archivos.length === 0
              ? `Hasta ${formatearPeso(LIMITE_BYTES)} en total. Se cifra al subirlo.`
              : `${archivos.length} ${archivos.length === 1 ? 'archivo' : 'archivos'} · ${formatearPeso(total)} de ${formatearPeso(LIMITE_BYTES)}`}
          </p>
          <button
            type="button"
            className={styles.zonaBoton}
            onClick={() => entradaRef.current?.click()}
          >
            {archivos.length === 0 ? 'Buscar archivo' : 'Añadir más'}
          </button>
        </div>

        {error && (
          <p className={styles.errorSubida} role="alert">
            {error}
          </p>
        )}

        {archivos.length > 0 && (
          <ul className={styles.lista}>
            {archivos.map((archivo, indice) => (
              <li className={styles.item} key={`${archivo.name}-${archivo.size}`}>
                <FileText size={17} className={styles.itemIcono} aria-hidden="true" />
                <span className={styles.itemNombre}>{archivo.name}</span>
                <span className={styles.itemPeso}>{formatearPeso(archivo.size)}</span>
                <button
                  type="button"
                  className={styles.itemQuitar}
                  onClick={() => quitar(indice)}
                  aria-label={`Quitar ${archivo.name}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.nota}>
          <Info size={15} aria-hidden="true" />
          <span>
            Calculamos su <strong>peso, extensión y hash</strong>. Es lo único que el
            comprador ve antes de pagar: nunca el archivo en sí.
          </span>
        </p>
      </section>

      {/* ── Paso 2 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>2</span>
          <h3 className={styles.pasoTitulo}>A quién se la vendes</h3>
        </div>

        <label className={styles.etiqueta} htmlFor="comprador">
          @usuario del comprador
        </label>
        <input
          id="comprador"
          name="comprador"
          type="text"
          className={`${styles.campo} ${styles.campoMono}`}
          placeholder="@trq-0000"
          defaultValue="@trq-4f7k"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <p className={styles.confirmacion}>
          <Check size={15} aria-hidden="true" />
          Ana R. — 17 operaciones completadas
        </p>
      </section>

      {/* ── Paso 3 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>3</span>
          <h3 className={styles.pasoTitulo}>Cuánto acordaron</h3>
        </div>

        <label className={styles.etiqueta} htmlFor="monto">
          Monto en COP
        </label>
        <input
          id="monto"
          name="monto"
          type="text"
          inputMode="numeric"
          className={`${styles.campo} ${styles.campoMonto}`}
          placeholder="0"
          defaultValue="450.000"
        />

        <p className={styles.avisoDinero}>
          <Banknote size={17} aria-hidden="true" />
          <span>
            Te transfiere <strong>directo a esa cuenta</strong>. MyTrueque no cobra, no
            retiene y no puede devolver ese dinero.
          </span>
        </p>
      </section>
    </>
  )
}
