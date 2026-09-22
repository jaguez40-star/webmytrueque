import { useRef } from 'react'
import { Check, FileText, Info, Upload, X } from 'lucide-react'
import { formatearPeso } from '../../utils/format'
import { LIMITE_BYTES, useNuevaOrden } from '../../context/contextoNuevaOrden'
import styles from './FormularioNuevaOrden.module.scss'

/**
 * Los tres pasos de crear una orden, sin armazón alrededor.
 *
 * Vive aparte de la página porque el mismo marcado se usa en dos sitios: a pantalla
 * completa en teléfono y dentro de un modal en escritorio.
 *
 * El estado NO vive aquí, vive en ContextoNuevaOrden: el botón de envío está fuera de este
 * componente (en el pie del modal y en la barra fija de la página) y necesita leerlo.
 */
export function FormularioNuevaOrden() {
  const entradaRef = useRef<HTMLInputElement>(null)
  const {
    archivos,
    comprador,
    error,
    enviando,
    progreso,
    agregarArchivos,
    quitarArchivo,
    setComprador,
  } = useNuevaOrden()

  const total = archivos.reduce((suma, archivo) => suma + archivo.size, 0)

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
            agregarArchivos(Array.from(evento.target.files ?? []))
            // Se limpia para que volver a elegir el MISMO archivo dispare `change` otra vez.
            evento.target.value = ''
          }}
        />

        <div
          className={styles.zonaSubida}
          onDragOver={(evento) => evento.preventDefault()}
          onDrop={(evento) => {
            evento.preventDefault()
            agregarArchivos(Array.from(evento.dataTransfer.files))
          }}
        >
          <span className={styles.zonaIcono}>
            <Upload size={13} aria-hidden="true" />
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
            disabled={enviando}
          >
            {archivos.length === 0 ? 'Buscar archivo' : 'Añadir más'}
          </button>
        </div>

        {error && (
          <p className={styles.errorSubida} role="alert">
            {error}
          </p>
        )}

        {enviando && (
          <div className={styles.progreso}>
            <div className={styles.progresoBarra}>
              <div className={styles.progresoRelleno} style={{ width: `${progreso}%` }} />
            </div>
            <span className={styles.progresoTexto}>Subiendo… {progreso}%</span>
          </div>
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
                  onClick={() => quitarArchivo(indice)}
                  aria-label={`Quitar ${archivo.name}`}
                  disabled={enviando}
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
          value={comprador}
          onChange={(evento) => setComprador(evento.target.value)}
          disabled={enviando}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <p className={styles.confirmacion}>
          <Check size={15} aria-hidden="true" />
          Te lo pasa el comprador desde su panel.
        </p>
      </section>

    </>
  )
}
