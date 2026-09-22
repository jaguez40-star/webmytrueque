import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/components/Button'
import { TextField } from '@/shared/components/TextField'
import { useLoginMutation, useRegisterMutation } from '../../hooks/useAuthMutations'
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '../../schemas/authSchemas'
import { ApiError } from '../../services/authService'
import styles from './AuthPanel.module.scss'

export type AuthTab = 'login' | 'register'

interface AuthPanelProps {
  tab: AuthTab
  onTabChange: (tab: AuthTab) => void
}

/**
 * Los errores de `authService` ya vienen con un mensaje presentable (incluido el de
 * "backend caído"). Solo se cae al genérico si llega algo que no es Error — no descartar
 * `error.message` de un Error cualquiera, que era el bug H5 de la v1.
 */
function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Ocurrió un error. Inténtalo de nuevo.'
}

export function AuthPanel({ tab, onTabChange }: AuthPanelProps) {
  const isLogin = tab === 'login'

  return (
    <div id="acceso" className={styles.panel}>
      <div className={styles.tabs} role="tablist" aria-label="Acceso">
        <button
          type="button"
          role="tab"
          aria-selected={isLogin}
          className={isLogin ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => onTabChange('login')}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isLogin}
          className={!isLogin ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => onTabChange('register')}
        >
          Crear cuenta
        </button>
      </div>

      {isLogin ? (
        <LoginForm onSwitch={() => onTabChange('register')} />
      ) : (
        <RegisterForm onSwitch={() => onTabChange('login')} />
      )}
    </div>
  )
}

const GOOGLE_AUTH_URL = import.meta.env.PROD
  ? '/auth/google'
  : 'http://localhost:8000/auth/google'

/** Manda al backend, que a su vez redirige a la pantalla de consentimiento de Google. */
function GoogleButton() {
  return (
    <a className={styles.googleButton} href={GOOGLE_AUTH_URL}>
      <svg className={styles.googleIcon} viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.87 2.69-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.97v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.97a9 9 0 0 0 0 8.08l3-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .97 4.96l3 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
      Continuar con Google
    </a>
  )
}

function Divider() {
  return (
    <div className={styles.divider}>
      <span>o</span>
    </div>
  )
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const mutation = useLoginMutation()
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  return (
    <div className={styles.body}>
      <h2 className={styles.title}>Bienvenido de vuelta</h2>
      <p className={styles.subtitle}>Entra para ver tus órdenes, liberaciones y descargas.</p>

      <form className={styles.form} onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <TextField
          label="Correo"
          type="email"
          placeholder="tu@correo.com"
          autoComplete="email"
          error={errors.email?.message}
          {...registerField('email')}
        />
        <TextField
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          labelAction={
            <a href="#preguntas" className={styles.labelLink}>
              ¿La olvidaste?
            </a>
          }
          error={errors.password?.message}
          {...registerField('password')}
        />
        {mutation.isError && (
          <p className={styles.formError} role="alert">
            {mensajeDeError(mutation.error)}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" fullWidth disabled={mutation.isPending}>
          {mutation.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <Divider />
      <GoogleButton />

      <p className={styles.foot}>
        ¿Primera vez aquí?{' '}
        <button type="button" className={styles.footLink} onClick={onSwitch}>
          Crea tu cuenta
        </button>
      </p>
    </div>
  )
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const mutation = useRegisterMutation()
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  })

  if (mutation.isSuccess) {
    return (
      <div className={styles.body}>
        <h2 className={styles.title}>Tu cuenta está lista</h2>
        <p className={styles.subtitle}>Este es tu @usuario. Es lo único que compartes para comprar o vender.</p>
        <div className={styles.handleBox}>
          <span className={styles.handleLabel}>TU @USUARIO</span>
          <span className={styles.handleValue}>{mutation.data.handle}</span>
        </div>
        <p className={styles.foot}>
          <button type="button" className={styles.footLink} onClick={onSwitch}>
            Ir a Entrar
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className={styles.body}>
      <h2 className={styles.title}>Crea tu cuenta</h2>
      <p className={styles.subtitle}>
        Al registrarte recibes tu @usuario: es lo único que compartes para comprar o vender.
      </p>

      <form className={styles.form} onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <TextField
          label="Correo"
          type="email"
          placeholder="tu@correo.com"
          autoComplete="email"
          error={errors.email?.message}
          {...registerField('email')}
        />
        <TextField
          label="Contraseña"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          error={errors.password?.message}
          {...registerField('password')}
        />

        <div>
          <label className={styles.checkboxRow}>
            <input type="checkbox" className={styles.checkbox} {...registerField('acceptedTerms')} />
            <span>
              Acepto los <a href="#preguntas">términos</a> y las{' '}
              <a href="#garantias">reglas de custodia</a>.
            </span>
          </label>
          {errors.acceptedTerms && (
            <span className={styles.checkboxError} role="alert">
              {errors.acceptedTerms.message}
            </span>
          )}
        </div>

        {mutation.isError && (
          <p className={styles.formError} role="alert">
            {mensajeDeError(mutation.error)}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={mutation.isPending}>
          {mutation.isPending ? 'Creando…' : 'Crear cuenta'}
        </Button>
      </form>

      <Divider />
      <GoogleButton />

      <p className={styles.foot}>
        ¿Ya tienes cuenta?{' '}
        <button type="button" className={styles.footLink} onClick={onSwitch}>
          Entrar
        </button>
      </p>
    </div>
  )
}
