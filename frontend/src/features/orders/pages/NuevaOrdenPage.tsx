import { Lock } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import { FormularioNuevaOrden } from '../components/FormularioNuevaOrden'
import styles from './NuevaOrdenPage.module.scss'

/**
 * Nueva orden a pantalla completa.
 *
 * Es lo que se ve en teléfono siempre, y en cualquier ancho al entrar directo por URL
 * (recarga o enlace pegado), porque entonces no hay panel debajo sobre el que superponer
 * nada. En escritorio, navegando desde el panel, se usa ModalNuevaOrden.
 */
export function NuevaOrdenPage() {
  return (
    <PanelShell
      volverA="/panel"
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

      <div className={styles.formulario}>
        <FormularioNuevaOrden />
      </div>
    </PanelShell>
  )
}
