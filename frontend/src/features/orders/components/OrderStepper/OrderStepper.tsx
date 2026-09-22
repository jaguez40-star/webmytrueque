import { ORDER_STATES, ETIQUETA_ESTADO, type OrderState } from '../../types'
import styles from './OrderStepper.module.scss'

interface OrderStepperProps {
  estado: OrderState
}

/**
 * Las 6 etapas como puntos conectados, con la actual resaltada.
 *
 * Es el mismo recorrido que promete la landing ("Seis estados. El último es el borrado"),
 * repetido dentro de cada orden para que la promesa de la portada se cumpla adentro.
 * En teléfono va sin etiquetas: solo los puntos, que caben de sobra a 360px.
 */
export function OrderStepper({ estado }: OrderStepperProps) {
  const indiceActual = ORDER_STATES.indexOf(estado)

  return (
    <ol
      className={styles.stepper}
      aria-label={`Etapa ${indiceActual + 1} de 6: ${ETIQUETA_ESTADO[estado]}`}
    >
      {ORDER_STATES.map((etapa, indice) => {
        const recorrida = indice < indiceActual
        const actual = indice === indiceActual
        const clasePunto = [
          styles.punto,
          recorrida ? styles.puntoRecorrido : '',
          actual ? styles.puntoActual : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <li key={etapa} className={styles.etapa}>
            <span className={clasePunto} />
            {indice < ORDER_STATES.length - 1 && (
              <span
                className={`${styles.linea} ${recorrida ? styles.lineaRecorrida : ''}`}
                aria-hidden="true"
              />
            )}
            <span className={styles.oculto}>{ETIQUETA_ESTADO[etapa]}</span>
          </li>
        )
      })}
    </ol>
  )
}
