import { Banknote, Check, Info, Lock, Upload } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import styles from './NuevaOrdenPage.module.scss'

/**
 * Formulario de creación de orden.
 *
 * ⚠️ MAQUETA FUNCIONAL: los campos son reales y editables, pero no hay endpoint al cual
 * enviarlos (el backend de órdenes no existe todavía). El botón final no envía nada. Es una
 * decisión explícita del plan, no un olvido.
 */
export function NuevaOrdenPage() {
  return (
    <PanelShell
      volverA="/panel"
      titulo="Nueva orden"
      barra={
        <BarraAccion
          nota={
            <>
              Quedará <strong className={styles.notaEstado}>EN CUSTODIA</strong> · se purga a
              los 30 días si no cierra
            </>
          }
        >
          <button type="button" className={styles.botonCrear}>
            <Lock size={18} aria-hidden="true" />
            Poner en custodia
          </button>
        </BarraAccion>
      }
    >
      <h1 className={styles.titulo}>Vender un archivo</h1>
      <p className={styles.subtitulo}>
        Tres datos y queda en custodia. El comprador lo verá en su panel.
      </p>

      {/* ── Paso 1 ── */}
      <section className={styles.paso}>
        <div className={styles.pasoCabeza}>
          <span className={styles.pasoNumero}>1</span>
          <h2 className={styles.pasoTitulo}>El archivo</h2>
        </div>

        <div className={styles.zonaSubida}>
          <span className={styles.zonaIcono}>
            <Upload size={21} aria-hidden="true" />
          </span>
          <p className={styles.zonaTitulo}>Elige el archivo a vender</p>
          <p className={styles.zonaTexto}>Hasta 5 GB. Se cifra al subirlo.</p>
          <button type="button" className={styles.zonaBoton}>
            Buscar en mi teléfono
          </button>
        </div>

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
          <h2 className={styles.pasoTitulo}>A quién se la vendes</h2>
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
          <h2 className={styles.pasoTitulo}>Cuánto acordaron</h2>
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

        <label className={styles.etiqueta} htmlFor="cuenta">
          Dónde te paga
        </label>
        <input
          id="cuenta"
          name="cuenta"
          type="text"
          className={styles.campo}
          placeholder="Nequi, Bancolombia, Daviplata…"
          defaultValue="Nequi · 300 000 0000"
        />

        <p className={styles.avisoDinero}>
          <Banknote size={17} aria-hidden="true" />
          <span>
            Te transfiere <strong>directo a esa cuenta</strong>. MyTrueque no cobra, no
            retiene y no puede devolver ese dinero.
          </span>
        </p>
      </section>
    </PanelShell>
  )
}
