import { AuthPanel, type AuthTab } from '@/features/auth/components/AuthPanel'
import { HERO } from '../../data/landingContent'
import styles from './Hero.module.scss'

interface HeroProps {
  authTab: AuthTab
  onAuthTabChange: (tab: AuthTab) => void
}

export function Hero({ authTab, onAuthTabChange }: HeroProps) {
  return (
    <section id="top" className={styles.hero}>
      <div>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          {HERO.badge}
        </div>

        <h1 className={styles.title}>{HERO.title}</h1>
        <p className={styles.paragraph}>{HERO.paragraph}</p>

        <div className={styles.benefits}>
          {HERO.benefits.map((benefit) => (
            <div key={benefit.lead} className={styles.benefit}>
              <span
                className={
                  benefit.tone === 'signal'
                    ? `${styles.bullet} ${styles.bulletSignal}`
                    : styles.bullet
                }
              />
              <span className={styles.benefitText}>
                <strong>{benefit.lead}</strong> <span>{benefit.rest}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <AuthPanel tab={authTab} onTabChange={onAuthTabChange} />
    </section>
  )
}
