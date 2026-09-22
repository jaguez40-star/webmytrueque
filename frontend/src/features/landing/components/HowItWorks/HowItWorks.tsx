import { CloudUpload, Search, Banknote, LockOpen, Download, Trash2, Lock } from 'lucide-react'
import { Logo } from '@/shared/components/Logo'
import { PIPELINE_STEPS, SELLER, BUYER, type StepIcon } from '../../data/landingContent'
import styles from './HowItWorks.module.scss'

function StepIconGlyph({ icon }: { icon: StepIcon }) {
  const size = 26
  switch (icon) {
    case 'upload':
      return <CloudUpload size={size} strokeWidth={2} />
    case 'search':
      return <Search size={size} strokeWidth={2.2} />
    case 'money':
      return <Banknote size={size} strokeWidth={2} />
    case 'release':
      return <LockOpen size={size} strokeWidth={2} />
    case 'download':
      return <Download size={size} strokeWidth={2.2} />
    case 'purge':
      return <Trash2 size={size} strokeWidth={2} />
  }
}

export function HowItWorks() {
  return (
    <section id="como-funciona" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.head}>
          <div>
            <div className={styles.eyebrow}>Cómo funciona</div>
            <h2 className={styles.title}>Seis estados. El último es el borrado.</h2>
          </div>
          <div className={styles.orderRef}>ORDEN #4821</div>
        </div>

        <div className={styles.card}>
          <div className={styles.steps}>
            <div className={`${styles.track} ${styles.trackDashed}`} aria-hidden="true" />
            <div className={`${styles.track} ${styles.trackDotted}`} aria-hidden="true" />

            {PIPELINE_STEPS.map((step) => (
              <div key={step.number} className={styles.step}>
                <div className={styles.tileRow}>
                  <span className={`${styles.tile} ${styles[`tile_${step.tone}`]}`}>
                    {step.tone === 'accent' && <span className={styles.pulse} aria-hidden="true" />}
                    <StepIconGlyph icon={step.icon} />
                  </span>
                </div>
                <div className={styles.chipRow}>
                  <span className={`${styles.chip} ${styles[`chip_${step.tone}`]}`}>{step.chip}</span>
                </div>
                <div className={styles.stepBody}>
                  <div className={styles.stepNumber}>{step.number}</div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepCaption}>{step.caption}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.peopleBlock}>
            <div className={styles.peopleHead}>
              <span className={styles.peopleEyebrow}>UNA ORDEN, DOS PERSONAS</span>
              <span className={styles.peopleMeta}>CIFRADO · SHA-256</span>
            </div>

            <div className={styles.people}>
              <article className={styles.personCard}>
                <div className={styles.photo}>
                  <img src={SELLER.photo} alt={SELLER.photoAlt} />
                </div>
                <div className={styles.personInfo}>
                  <div className={styles.personRole}>{SELLER.role}</div>
                  <div className={styles.personName}>{SELLER.name}</div>
                  <div className={styles.personHandle}>{SELLER.handle}</div>
                  <div className={styles.personChips}>
                    <span className={styles.chipSignal}>{SELLER.chip}</span>
                    <span className={styles.chipNote}>{SELLER.chipNote}</span>
                  </div>
                  <div className={styles.personCaption}>{SELLER.caption}</div>
                </div>
              </article>

              <div className={styles.custody}>
                <span className={styles.custodyLogo}>
                  <Logo variant="badge" />
                </span>
                <span className={styles.custodyLabel}>CUSTODIA</span>
                <span className={styles.lock}>
                  <span className={styles.pulse} aria-hidden="true" />
                  <Lock size={26} strokeWidth={2.4} color="#ffffff" />
                </span>
                <span className={styles.custodyDots} aria-hidden="true">
                  <span className={styles.dotSignal} />
                  <span className={styles.dotAccent} />
                  <span className={styles.dotDark} />
                </span>
                <span className={styles.custodyCaption}>Se borra al descargarse</span>
              </div>

              <article className={`${styles.personCard} ${styles.personCardMirror}`}>
                <div className={`${styles.personInfo} ${styles.personInfoRight}`}>
                  <div className={styles.personRole}>{BUYER.role}</div>
                  <div className={styles.personName}>{BUYER.name}</div>
                  <div className={styles.personHandle}>{BUYER.handle}</div>
                  <div className={styles.personChips}>
                    <span className={styles.chipNote}>{BUYER.chipNote}</span>
                    <span className={styles.chipAccent}>{BUYER.chip}</span>
                  </div>
                  <div className={styles.personCaption}>{BUYER.caption}</div>
                </div>
                <div className={styles.photo}>
                  <img src={BUYER.photo} alt={BUYER.photoAlt} />
                </div>
              </article>
            </div>

            <div className={styles.moneyStrip}>
              <span className={styles.moneyBadge}>
                <Logo variant="muted" />
                <span className={styles.moneyBadgeText}>MYTRUEQUE</span>
                <span className={styles.strike} aria-hidden="true" />
              </span>
              <p className={styles.moneyText}>
                El pago va de Ana a Carlos, cuenta a cuenta.{' '}
                <strong>Nunca pasa por la plataforma.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
