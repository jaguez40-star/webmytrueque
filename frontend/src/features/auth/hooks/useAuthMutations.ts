import { useMutation, useQueryClient } from '@tanstack/react-query'
import { login, logout, register } from '../services/authService'
import { useAuthStore } from '../store/authStore'
import type { LoginFormValues, RegisterFormValues } from '../schemas/authSchemas'

export function useLoginMutation() {
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: (values: LoginFormValues) => login(values),
    onSuccess: (user) => setUser(user),
  })
}

export function useRegisterMutation() {
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: (values: RegisterFormValues) => register(values),
    onSuccess: (user) => setUser(user),
  })
}

export function useLogoutMutation() {
  const clearUser = useAuthStore((state) => state.clearUser)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      clearUser()
      // Poner la caché de /auth/me en null en vez de `queryClient.clear()`: clear()
      // vacía la caché entera y deja la query montada sin datos, lo que dispara un
      // refetch inmediato al backend. Escribir el valor es determinista y no pega a red.
      queryClient.setQueryData(['auth', 'me'], null)
    },
  })
}
