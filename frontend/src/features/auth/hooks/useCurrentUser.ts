import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCurrentUser } from '../services/authService'
import { useAuthStore } from '../store/authStore'

/**
 * Al montar la app, pregunta al backend si la cookie de sesión sigue siendo válida.
 * Así una recarga de página no deja al usuario "deslogueado" visualmente.
 */
export function useCurrentUser() {
  const setUser = useAuthStore((state) => state.setUser)
  const setHydrated = useAuthStore((state) => state.setHydrated)

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: Infinity, // no re-preguntar en cada foco/montaje; login/logout ya actualizan el store
  })

  useEffect(() => {
    // isError no debería ocurrir (fetchCurrentUser no lanza), pero si ocurriera hay que
    // salir igual del estado "cargando" (H4).
    if (query.isError) {
      setHydrated()
      return
    }
    if (query.isSuccess) {
      if (query.data) setUser(query.data)
      else setHydrated()
    }
  }, [query.isError, query.isSuccess, query.data, setUser, setHydrated])

  return query
}
