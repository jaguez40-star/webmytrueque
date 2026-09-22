import createClient from 'openapi-fetch'
import type { paths } from './schema'

export const apiClient = createClient<paths>({
  baseUrl: 'http://localhost:8000',
  credentials: 'include', // manda/recibe la cookie de sesión httpOnly
})
