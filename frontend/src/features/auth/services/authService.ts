import { apiClient } from '@/lib/api/client'
import type { LoginFormValues, RegisterFormValues } from '../schemas/authSchemas'
import type { AuthUser } from '../store/authStore'

export class ApiError extends Error {}

const MENSAJE_SIN_CONEXION =
  'No se pudo conectar con el servidor. ¿Está corriendo el backend en el puerto 8000?'

export async function register(values: RegisterFormValues): Promise<AuthUser> {
  const { data, error } = await withNetworkGuard(() =>
    apiClient.POST('/auth/register', {
      body: { email: values.email, password: values.password },
    }),
  )
  if (error) {
    throw new ApiError(errorMessage(error, 'No se pudo crear la cuenta.'))
  }
  return data
}

export async function login(values: LoginFormValues): Promise<AuthUser> {
  const { data, error } = await withNetworkGuard(() =>
    apiClient.POST('/auth/login', {
      body: { email: values.email, password: values.password },
    }),
  )
  if (error) {
    throw new ApiError(errorMessage(error, 'Correo o contraseña incorrectos.'))
  }
  return data
}

export async function logout(): Promise<void> {
  try {
    await apiClient.POST('/auth/logout')
  } catch {
    // Si el backend no responde, igual limpiamos la sesión del lado del cliente:
    // dejar al usuario "logueado" en la UI por un fallo de red sería peor.
  }
}

/**
 * Devuelve el usuario si hay sesión activa, o null si no.
 * **Nunca lanza** — ni por 401 ni por caída de red (H3/H4): quien la llama la usa para
 * decidir el estado inicial de la app, y una excepción aquí dejaría la UI en "cargando"
 * para siempre.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data, error } = await apiClient.GET('/auth/me')
    if (error) return null
    return data
  } catch {
    return null
  }
}

/**
 * openapi-fetch lanza TypeError si el fetch no llega a completarse (backend caído, DNS,
 * CORS bloqueado). Lo convierte en el mismo `{ data, error }` que devuelve en el resto de
 * los casos, para que quien llama tenga una sola forma que manejar.
 */
async function withNetworkGuard<T>(
  call: () => Promise<{ data?: T; error?: unknown }>,
): Promise<{ data: T; error?: unknown }> {
  try {
    const result = await call()
    return result as { data: T; error?: unknown }
  } catch {
    return { data: undefined as T, error: { detail: MENSAJE_SIN_CONEXION } }
  }
}

// El error de FastAPI trae { detail: string } (401/409) o { detail: ValidationError[] }
// (422). Solo el primero es texto presentable al usuario; el 422 cae al fallback porque
// zod ya valida lo mismo en el cliente y ese caso no debería llegar aquí.
function errorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'detail' in error &&
    typeof (error as { detail: unknown }).detail === 'string'
  ) {
    return (error as { detail: string }).detail
  }
  return fallback
}
