import { LegalLayout } from '../components/LegalLayout'

export function TerminosPage() {
  return (
    <LegalLayout title="Condiciones del servicio" actualizado="22 de septiembre de 2026">
      <h2>Qué es MyTrueque</h2>
      <p>
        MyTrueque es un intermediario entre dos personas —vendedor y comprador— para la compra y
        venta de archivos digitales. Cada trato es 1 a 1, identificado por el{' '}
        <strong>@usuario</strong> de cada parte. No hay catálogo público ni perfiles que se puedan
        buscar.
      </p>

      <h2>Cómo funciona una orden</h2>
      <p>Toda orden pasa por los mismos seis estados, en este orden:</p>
      <p>
        <strong>
          En custodia → En inspección → Pago enviado → Liberado → Descargado → Purgado
        </strong>
      </p>
      <p>
        El vendedor sube el archivo a custodia cifrada. El comprador ve su ficha técnica
        (extensión, peso y hash) antes de pagar. El pago se hace <strong>por fuera</strong> de la
        plataforma, directo entre las partes — MyTrueque no participa de esa transferencia ni es
        responsable por ella.
      </p>
      <p>
        Con el comprobante de pago cargado, si el vendedor no libera la descarga dentro de las 24
        horas siguientes, la plataforma la habilita automáticamente.
      </p>

      <h2>Límites técnicos</h2>
      <p>Cada orden admite hasta 1 GB de archivos en total, sumando todos los que la componen.</p>

      <h2>Responsabilidad sobre el contenido</h2>
      <p>
        Cada usuario es el único responsable de la legalidad de lo que sube o compra, y de contar
        con los derechos necesarios sobre ese contenido. MyTrueque no revisa el contenido de los
        archivos en custodia. Está prohibido subir contenido ilegal, que infrinja derechos de
        autor ajenos sin autorización, o que sea dañino para terceros.
      </p>

      <h2>Tu cuenta</h2>
      <p>
        Un usuario, un @usuario. No están permitidos los perfiles públicos ni los enlaces de venta
        abiertos a cualquiera. Podemos suspender cuentas que incumplan estas condiciones.
      </p>

      <h2>Disponibilidad del servicio</h2>
      <p>
        MyTrueque está en una etapa temprana de desarrollo. No garantizamos disponibilidad
        continua ni ausencia de errores.
      </p>

      <h2>Cambios a estas condiciones</h2>
      <p>
        Podemos actualizar este documento a medida que la plataforma evoluciona. La fecha de la
        última actualización figura arriba.
      </p>

      <h2>Contacto</h2>
      <p>
        Escribinos a <a href="mailto:rr5797372@gmail.com">rr5797372@gmail.com</a> ante cualquier
        duda sobre estas condiciones.
      </p>
    </LegalLayout>
  )
}
