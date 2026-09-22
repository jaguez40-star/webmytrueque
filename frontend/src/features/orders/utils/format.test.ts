import { describe, it, expect } from 'vitest'
import { formatearMonto, formatearPeso, hashCorto, hashMinimo, tiempoRestante } from './format'

describe('formatearPeso', () => {
  // Estos casos son el hallazgo H1: la versión anterior devolvía "240 MB" y "18,0 MB".
  it('muestra un decimal de MB en adelante, y ninguno por debajo', () => {
    expect(formatearPeso(252_125_184)).toBe('240,4 MB')
    expect(formatearPeso(1_932_735_283)).toBe('1,8 GB')
    expect(formatearPeso(839_680)).toBe('820 KB')
    expect(formatearPeso(512)).toBe('512 B')
  })

  it('no deja decimales vacíos tipo "18,0 MB"', () => {
    expect(formatearPeso(18_874_368)).toBe('18 MB')
  })
})

describe('formatearMonto', () => {
  it('usa el punto como separador de miles y no pone decimales', () => {
    expect(formatearMonto(450_000)).toBe('$450.000')
    expect(formatearMonto(1_200_500)).toBe('$1.200.500')
  })
})

describe('hash', () => {
  it('abrevia dejando los extremos, que son los que se comparan', () => {
    const hash = 'a3f97c2e14b8d0516ff3a9c47e2b8d1069c5a4f3e78b2d91c0a6f5e4b3d2c21b'
    expect(hashCorto(hash)).toBe('a3f97c2e…b3d2c21b')
    expect(hashMinimo(hash)).toBe('a3f9…c21b')
  })
})

describe('tiempoRestante', () => {
  it('devuelve null cuando el plazo ya venció', () => {
    const ahora = new Date('2026-09-21T12:00:00Z')
    expect(tiempoRestante('2026-09-21T11:00:00Z', ahora)).toBeNull()
  })
})
