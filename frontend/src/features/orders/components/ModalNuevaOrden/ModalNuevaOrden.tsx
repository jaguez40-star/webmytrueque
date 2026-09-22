import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Modal } from '@/shared/components/Modal'
import { FormularioNuevaOrden } from '../FormularioNuevaOrden'
import { useNuevaOrden } from '../../context/contextoNuevaOrden'
import { ProveedorNuevaOrden } from '../../context/ProveedorNuevaOrden'
import { useCrearOrden } from '../../hooks/useCrearOrden'
import styles from './ModalNuevaOrden.module.scss'

/**
 * El formulario de nueva orden dentro de un modal, para pantallas anchas.
 *
 * Al cerrar hace `navigate(-1)` en vez de ocultar un estado local: la ruta /panel/nueva
 * está realmente activa (por eso el botón atrás del navegador también lo cierra), así que
 * cerrar es exactamente volver atrás. Si se ocultara sin navegar, la URL quedaría mintiendo.
 */
export function ModalNuevaOrden() {
  return (
    <ProveedorNuevaOrden>
      <ContenidoModal />
    </ProveedorNuevaOrden>
  )
}

function ContenidoModal() {
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
    <Modal
      titulo="Vender file(s)"
      subtitulo="Dos datos y queda en custodia. El comprador lo verá en su panel."
      // Mientras sube no se cierra: cerrar desmonta el componente y aborta la petición
      // a medias, dejando archivos a medio escribir en el servidor.
      onCerrar={() => {
        if (!enviando) navigate(-1)
      }}
      pie={
        <div className={styles.pie}>
          <p className={styles.nota}>
            Quedará <strong className={styles.notaEstado}>EN CUSTODIA</strong> · se purga a
            los 30 días si no cierra
          </p>
          <button
            type="button"
            className={styles.botonCrear}
            onClick={enviar}
            disabled={!puedeEnviar || enviando}
          >
            <Lock size={18} aria-hidden="true" />
            {enviando ? 'Subiendo…' : 'Poner en custodia'}
          </button>
        </div>
      }
    >
      <FormularioNuevaOrden />
    </Modal>
  )
}
