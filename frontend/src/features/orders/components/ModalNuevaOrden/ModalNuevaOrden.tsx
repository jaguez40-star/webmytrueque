import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Modal } from '@/shared/components/Modal'
import { FormularioNuevaOrden } from '../FormularioNuevaOrden'
import styles from './ModalNuevaOrden.module.scss'

/**
 * El formulario de nueva orden dentro de un modal, para pantallas anchas.
 *
 * Al cerrar hace `navigate(-1)` en vez de ocultar un estado local: la ruta /panel/nueva
 * está realmente activa (por eso el botón atrás del navegador también lo cierra), así que
 * cerrar es exactamente volver atrás. Si se ocultara sin navegar, la URL quedaría mintiendo.
 */
export function ModalNuevaOrden() {
  const navigate = useNavigate()

  return (
    <Modal
      titulo="Vender file(s)"
      subtitulo="Tres datos y queda en custodia. El comprador lo verá en su panel."
      onCerrar={() => navigate(-1)}
      pie={
        <div className={styles.pie}>
          <p className={styles.nota}>
            Quedará <strong className={styles.notaEstado}>EN CUSTODIA</strong> · se purga a
            los 30 días si no cierra
          </p>
          <button type="button" className={styles.botonCrear}>
            <Lock size={18} aria-hidden="true" />
            Poner en custodia
          </button>
        </div>
      }
    >
      <FormularioNuevaOrden />
    </Modal>
  )
}
