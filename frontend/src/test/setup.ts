import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// El auto-cleanup de @testing-library/react depende de detectar `afterEach` como
// global; este proyecto corre sin `test.globals` (decisión del plan), así que se
// registra a mano. Sin esto, el DOM de un test queda montado sobre el siguiente.
afterEach(() => {
  cleanup()
})
