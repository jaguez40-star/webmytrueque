import { useEffect, useRef, useState } from 'react'
import { Check, Copy, LogOut, Share2, X } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations'
import { useCompartirUsuario } from '../../hooks/useCompartirUsuario'
import styles from './MenuCuenta.module.scss'

/**
 * Avatar que despliega la cuenta, al estilo del menú de Google.
 *
 * Antes esto era una pantalla entera (/panel/cuenta), lo que obligaba a salir de donde
 * estabas para algo tan puntual como copiar tu @usuario o cerrar sesión. Como menú, está
 * disponible desde cualquier pantalla del panel sin perder el contexto.
 */
export function MenuCuenta() {
  const user = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const botonRef = useRef<HTMLButtonElement>(null)
  const { copiar, compartir, copiado, puedeCompartir } = useCompartirUsuario(
    user?.handle ?? '',
  )

  // Dos últimos caracteres del @usuario: "@trq-925j" -> "9j". Basta para reconocerse.
  const iniciales = user?.handle.slice(-2) ?? '··'

  // Cierra al tocar fuera o con Escape, que es lo que cualquiera espera de un menú. El
  // efecto solo registra listeners — no llama a setState durante el render.
  useEffect(() => {
    if (!abierto) return

    function alTocarFuera(evento: MouseEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false)
      }
    }
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setAbierto(false)
        // Devuelve el foco al avatar: sin esto, cerrar con teclado lo deja en el limbo.
        botonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', alTocarFuera)
    document.addEventListener('keydown', alPulsarTecla)
    return () => {
      document.removeEventListener('mousedown', alTocarFuera)
      document.removeEventListener('keydown', alPulsarTecla)
    }
  }, [abierto])

  return (
    <div className={styles.contenedor} ref={contenedorRef}>
      <button
        type="button"
        ref={botonRef}
        className={styles.avatarZona}
        onClick={() => setAbierto((previo) => !previo)}
        aria-label="Tu cuenta"
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <span className={styles.avatar}>{iniciales}</span>
      </button>

      {abierto && (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            className={styles.cerrar}
            onClick={() => setAbierto(false)}
            aria-label="Cerrar el menú"
          >
            <X size={18} aria-hidden="true" />
          </button>

          {/* Sin repetir el avatar aquí dentro: ya está en el header, justo encima, y es
              desde donde se abrió este menú. */}
          <div className={styles.identidad}>
            <span className={styles.handle} data-testid="mi-handle">
              {user?.handle ?? ''}
            </span>
            <span className={styles.correo} data-testid="mi-correo">
              {user?.email ?? ''}
            </span>
          </div>

          <p className={styles.nota}>
            Tu @usuario es lo único que compartes para comprar o vender. No hay enlaces
            públicos ni perfiles que alguien pueda buscar.
          </p>

          <div className={styles.acciones}>
            <button type="button" className={styles.botonSignal} onClick={copiar}>
              {copiado ? (
                <>
                  <Check size={17} aria-hidden="true" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy size={17} aria-hidden="true" />
                  Copiar
                </>
              )}
            </button>
            {/* Solo donde hay menú nativo de compartir: en un escritorio sin él, el botón
                haría lo mismo que "Copiar" y sobraría. */}
            {puedeCompartir && (
              <button type="button" className={styles.botonNeutro} onClick={compartir}>
                <Share2 size={17} aria-hidden="true" />
                Compartir
              </button>
            )}
          </div>

          <button
            type="button"
            className={styles.salir}
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut size={18} aria-hidden="true" />
            Cerrar sesión
          </button>

          <p className={styles.custodia}>
            Los archivos van cifrados mientras dure la orden y se borran al confirmarse la
            descarga. El dinero nunca pasa por MyTrueque.
          </p>
        </div>
      )}
    </div>
  )
}
