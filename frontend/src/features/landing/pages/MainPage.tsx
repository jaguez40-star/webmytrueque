import { useState } from 'react'
import { Header } from '../components/Header'
import { Hero } from '../components/Hero'
import { HowItWorks } from '../components/HowItWorks'
import { Inspection } from '../components/Inspection'
import { Guarantees } from '../components/Guarantees'
import { Faq } from '../components/Faq'
import { Footer } from '../components/Footer'
import type { AuthTab } from '@/features/auth/components/AuthPanel'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import styles from './MainPage.module.scss'

/** Mensajes para los códigos que devuelve el callback de Google. */
const MOTIVOS_DE_ERROR: Record<string, string> = {
  access_denied: 'Cancelaste el acceso con Google, o esa cuenta no está autorizada para probar.',
  correo_no_verificado: 'Google no confirmó ese correo, así que no podemos usarlo para entrar.',
  estado_invalido: 'La sesión de acceso expiró. Vuelve a intentarlo.',
  sin_codigo: 'Google no devolvió el código de acceso. Vuelve a intentarlo.',
  google_fallo: 'No pudimos completar el acceso con Google. Vuelve a intentarlo.',
}

/**
 * Lee "?auth=error&reason=..." UNA sola vez, al cargar el módulo, y limpia la URL.
 * Fuera del componente a propósito: es un efecto de navegación que ocurre una vez por
 * carga de página, no por montaje. Hacerlo en useEffect + setState dispara un render en
 * cascada (oxlint react/set-state-in-effect) y se repetiría en StrictMode (H3).
 */
function leerErrorDeGoogleDeLaUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const auth = params.get('auth')
  if (!auth) return null
  window.history.replaceState({}, '', window.location.pathname)
  if (auth !== 'error') return null
  const reason = params.get('reason') ?? ''
  return MOTIVOS_DE_ERROR[reason] ?? 'No pudimos completar el acceso con Google.'
}

const ERROR_DE_GOOGLE_INICIAL = leerErrorDeGoogleDeLaUrl()

export function MainPage() {
  useCurrentUser()
  const [authTab, setAuthTab] = useState<AuthTab>('login')
  const [googleError] = useState<string | null>(ERROR_DE_GOOGLE_INICIAL)

  /** Cambia la pestaña y lleva al usuario al panel de acceso. */
  function goToAuth(tab: AuthTab) {
    setAuthTab(tab)
    document.getElementById('acceso')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className={styles.page}>
      <Header onGoToAuth={goToAuth} />
      <main>
        {googleError && (
          <div className={styles.googleError} role="alert">
            {googleError}
          </div>
        )}
        <Hero authTab={authTab} onAuthTabChange={setAuthTab} />
        <HowItWorks />
        <Inspection />
        <Guarantees />
        <Faq onGoToAuth={goToAuth} />
      </main>
      <Footer />
    </div>
  )
}
