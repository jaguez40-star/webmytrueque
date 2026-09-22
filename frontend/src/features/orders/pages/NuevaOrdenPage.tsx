import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { PanelShell } from '../components/PanelShell'
import { BarraAccion } from '../components/BarraAccion'
import { FormularioNuevaOrden } from '../components/FormularioNuevaOrden'
import { useNuevaOrden } from '../context/contextoNuevaOrden'
import { ProveedorNuevaOrden } from '../context/ProveedorNuevaOrden'
import { useCrearOrden } from '../hooks/useCrearOrden'
import styles from './NuevaOrdenPage.module.scss'

/**
 * Nueva orden a pantalla completa.
 *
 * Es lo que se ve en teléfono siempre, y en cualquier ancho al entrar directo por URL
 * (recarga o enlace pegado). En escritorio, navegando desde el panel, se usa ModalNuevaOrden.
 */
export function NuevaOrdenPage() {
  return (
    <ProveedorNuevaOrden>
      <ContenidoPagina />
    </ProveedorNuevaOrden>
  )
}

function ContenidoPagina() {
  const navigate = useNavigate()
  const { archivos, comprador, enviando, setEnviando, setProgreso, setError } =
    useNuevaOrden()
  const mutacion = useCrearOrden(setProgreso)

  const puedeEnviar = archivos.length > 0 && comprador.trim() !== ''

  function enviar() {
    setError(null)
    setEnviando(true)
    setProgreso(0)
    mutacion.mutate(
      { archivos, comprador },
      {
        onSuccess: () => {
          setEnviando(false)
          navigate('/panel')
        },
        onError: (fallo: Error) => {
          setEnviando(false)
          setError(fallo.message)
        },
      },
    )
  }

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
          <button
            type="button"
            className={styles.botonCrear}
            onClick={enviar}
            disabled={!puedeEnviar || enviando}
          >
            <Lock size={18} aria-hidden="true" />
            {enviando ? 'Subiendo…' : 'Poner en custodia'}
          </button>
        </BarraAccion>
      }
    >
      <h1 className={styles.titulo}>Vender file(s)</h1>
      <p className={styles.subtitulo}>
        Dos datos y queda en custodia. El comprador lo verá en su panel.
      </p>

      <div className={styles.formulario}>
        <FormularioNuevaOrden />
      </div>
    </PanelShell>
  )
}
