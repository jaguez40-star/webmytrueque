import { Button } from '@/shared/components/Button'
import { FAQ_ITEMS } from '../../data/landingContent'
import type { AuthTab } from '@/features/auth/components/AuthPanel'
import styles from './Faq.module.scss'

interface FaqProps {
  onGoToAuth: (tab: AuthTab) => void
}

export function Faq({ onGoToAuth }: FaqProps) {
  return (
    <section id="preguntas" className={styles.section}>
      <div className={styles.container}>
        <div>
          <h2 className={styles.title}>Sube tu primer archivo hoy.</h2>
          <p className={styles.paragraph}>
            Cuenta gratis, sin tarjeta y sin instalar nada: funciona desde el navegador.
          </p>
          <div className={styles.actions}>
            <Button variant="signal" size="lg" onClick={() => onGoToAuth('register')}>
              Crear cuenta
            </Button>
            <Button variant="ghost-dark" size="lg" onClick={() => onGoToAuth('login')}>
              Ya tengo cuenta
            </Button>
          </div>
        </div>

        <div className={styles.items}>
          {FAQ_ITEMS.map((item) => (
            <div key={item.question}>
              <h3 className={styles.question}>{item.question}</h3>
              <p className={styles.answer}>{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
