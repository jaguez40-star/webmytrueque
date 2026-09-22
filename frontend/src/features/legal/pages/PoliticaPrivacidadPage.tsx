import { LegalLayout } from '../components/LegalLayout'

export function PoliticaPrivacidadPage() {
  return (
    <LegalLayout title="Política de privacidad" actualizado="22 de septiembre de 2026">
      <h2>Qué datos recopilamos</h2>
      <p>
        Para crear tu cuenta guardamos tu correo electrónico. Si te registrás con correo y
        contraseña, guardamos un hash de tu contraseña — nunca la contraseña en texto plano. Si
        entrás con <strong>Google</strong>, recibimos de Google tu nombre, tu correo y tu foto de
        perfil.
      </p>
      <p>
        Al crear tu cuenta te asignamos un <strong>@usuario</strong> único y aleatorio. No existen
        perfiles públicos ni buscables: tu @usuario solo lo conoce quien vos se lo compartas
        directamente.
      </p>

      <h2>Archivos en custodia</h2>
      <p>
        Los archivos que subís a una orden se guardan cifrados en nuestro servidor solo mientras
        dura la operación. Se borran automáticamente al confirmarse la descarga, o a los 30 días
        si la orden nunca se cierra.
      </p>

      <h2>El dinero</h2>
      <p>
        MyTrueque no procesa pagos ni guarda datos bancarios ni de tarjetas. La transferencia de
        dinero es directa entre comprador y vendedor, fuera de la plataforma.
      </p>

      <h2>Cómo usamos tus datos</h2>
      <ul>
        <li>Para identificarte y mantener tu sesión iniciada.</li>
        <li>Para mostrarte tus órdenes en custodia y su estado.</li>
        <li>Para comunicarte novedades relacionadas con tu cuenta u orden, si hace falta.</li>
      </ul>
      <p>No vendemos ni compartimos tus datos con terceros de publicidad o marketing.</p>

      <h2>Con quién los compartimos</h2>
      <p>
        Si elegís entrar con Google, Google procesa esa autenticación según su propia política de
        privacidad. Alojamos la aplicación en la infraestructura de Amazon Web Services (AWS).
      </p>

      <h2>Tus derechos</h2>
      <p>
        Podés pedir la baja de tu cuenta y el borrado de tus datos en cualquier momento,
        escribiéndonos a{' '}
        <a href="mailto:rr5797372@gmail.com">rr5797372@gmail.com</a>.
      </p>

      <h2>Cambios a esta política</h2>
      <p>
        Podemos actualizar este documento a medida que la plataforma evoluciona. La fecha de la
        última actualización figura arriba.
      </p>
    </LegalLayout>
  )
}
