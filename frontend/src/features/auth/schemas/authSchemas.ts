import { z } from 'zod'

const emailField = z.email({
  error: (issue) => (issue.input === '' ? 'Escribe tu correo.' : 'Ese correo no parece válido.'),
})

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

export const registerSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres.'),
  acceptedTerms: z.literal(true, { error: 'Acepta los términos y las reglas de custodia.' }),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
