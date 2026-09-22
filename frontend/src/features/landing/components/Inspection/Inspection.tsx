import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { FILE_CARD, SELLER, BUYER } from '../../data/landingContent'
import styles from './Inspection.module.scss'

export function Inspection() {
  const [released, setReleased] = useState(false)

  return (
    <section id="inspeccion" className={styles.section}>
      <div className={styles.container}>
        <div>
          <div className={styles.eyebrow}>La inspección</div>
          <h2 className={styles.title}>Todo sobre el archivo. Menos el archivo.</h2>
          <p className={styles.paragraph}>
            Así ve el comprador lo que está a punto de pagar. El archivo ya está en custodia,
            pero la descarga no se habilita hasta que el vendedor libera. El hash le permite
            comprobar después que recibió exactamente lo que inspeccionó.
          </p>
          <Button
            variant="outline-accent"
            size="md"
            className={styles.demoButton}
            onClick={() => setReleased((value) => !value)}
          >
            {released ? 'Volver al estado bloqueado' : 'Simular: el vendedor libera la descarga'}
          </Button>
          <p className={styles.demoNote}>DEMO INTERACTIVA</p>
        </div>

        <div className={styles.fileCard}>
          <div className={styles.fileHead}>
            <div className={styles.fileIdentity}>
              <span className={styles.fileExt}>{FILE_CARD.extension}</span>
              <div>
                <div className={styles.fileName}>{FILE_CARD.name}</div>
                <div className={styles.fileOrder}>
                  {FILE_CARD.order}
                  <span className={styles.sep}>·</span>
                  <span className={styles.handle}>{SELLER.handle}</span>
                  <span className={styles.sep}>→</span>
                  <span className={styles.handle}>{BUYER.handle}</span>
                </div>
              </div>
            </div>
            <span
              className={released ? `${styles.badge} ${styles.badgeReleased}` : styles.badge}
              data-testid="file-status-badge"
            >
              {released ? 'LIBERADO' : 'EN INSPECCIÓN'}
            </span>
          </div>

          <div className={styles.metaGrid}>
            {FILE_CARD.metadata.map((item) => (
              <div key={item.label} className={styles.metaCell}>
                <div className={styles.metaLabel}>{item.label}</div>
                <div className={item.accent ? `${styles.metaValue} ${styles.metaValueAccent}` : styles.metaValue}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.hashBlock}>
            <div className={styles.hashHead}>
              <div className={styles.hashLabel}>{FILE_CARD.hashLabel}</div>
              <span className={styles.verifiable}>
                <span className={styles.verifiableDot} />
                VERIFICABLE
              </span>
            </div>
            <div className={styles.hashValue}>{FILE_CARD.hash}</div>
          </div>

          <div className={styles.actionZone}>
            {released ? (
              <>
                <Button variant="primary" size="xl" fullWidth>
                  Descargar ahora · 1.84 GB
                </Button>
                <p className={styles.actionNote}>
                  El vendedor liberó la orden. Al confirmarse la descarga se comprueba el hash y
                  el archivo se purga de la custodia.
                </p>
              </>
            ) : (
              <>
                <button type="button" className={styles.blockedButton} disabled>
                  Descarga bloqueada · esperando liberación del vendedor
                </button>
                <p className={styles.actionNote}>
                  Puedes verificar todos los datos y el hash. El archivo está en custodia cifrada:
                  ni el vendedor puede retirarlo ni tú descargarlo aún.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
