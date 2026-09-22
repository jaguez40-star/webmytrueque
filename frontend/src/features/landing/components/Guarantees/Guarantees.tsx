import { GUARANTEES } from '../../data/landingContent'
import styles from './Guarantees.module.scss'

export function Guarantees() {
  return (
    <section id="garantias" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.eyebrow}>Garantías</div>
        <h2 className={styles.title}>Custodia mientras dura el trato. Nada después.</h2>
        <p className={styles.paragraph}>
          El archivo vive en nuestros servidores solo el tiempo de la orden, cifrado y bloqueado
          para ambas partes. Eso nos permite garantizar la entrega sin convertirnos en un
          repositorio de contenido ajeno.
        </p>

        <div className={styles.cards}>
          {GUARANTEES.map((item) => (
            <article key={item.eyebrow} className={styles.card}>
              <div className={styles.cardEyebrow}>{item.eyebrow}</div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardText}>{item.text}</p>
            </article>
          ))}
        </div>

        <div className={styles.note}>
          <span className={styles.noteBadge}>SÉ CLARO</span>
          <p className={styles.noteText}>
            MyTrueque custodia el archivo, no el dinero: no podemos devolver un pago hecho por
            fuera. Usa siempre un medio con comprobante y sube el soporte a la orden — es lo que
            activa la liberación automática a tu favor.
          </p>
        </div>
      </div>
    </section>
  )
}
