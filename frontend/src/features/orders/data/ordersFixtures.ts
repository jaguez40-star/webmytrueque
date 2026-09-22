/**
 * Órdenes de ejemplo para desarrollar y revisar las pantallas.
 *
 * ⚠️ TEMPORAL: desaparece cuando exista el backend de órdenes. Ningún componente debe
 * importar este archivo — todos piden los datos a `useOrders()`.
 *
 * Las fechas son relativas a "ahora" para que los tiempos restantes siempre muestren algo
 * con sentido, en vez de quedar vencidos al día siguiente de escribir el fixture.
 */
import type { Order } from '../types'

function enHoras(horas: number): string {
  return new Date(Date.now() + horas * 3600_000).toISOString()
}

function haceHoras(horas: number): string {
  return new Date(Date.now() - horas * 3600_000).toISOString()
}

function enDias(dias: number): string {
  return enHoras(dias * 24)
}

export const ORDENES_DE_EJEMPLO: Order[] = [
  {
    id: '4821',
    estado: 'PAGO_ENVIADO',
    rol: 'vendedor',
    contraparte: { nombre: 'Ana R.', handle: '@trq-4f7k', operaciones: 17 },
    archivos: [{
      nombre: 'entrega-final-branding.zip',
      extension: '.zip',
      bytes: 252_125_184,
      hash: 'a3f97c2e14b8d0516ff3a9c47e2b8d1069c5a4f3e78b2d91c0a6f5e4b3d2c21b',
      subidoEn: haceHoras(31),
      archivosDentro: 34,
    }],
    montoCop: 450_000,
    creadaEn: haceHoras(31),
    liberaAutomaticaEn: enHoras(18.7),
    purgaEn: enDias(28),
    comprobante: {
      nombre: 'transferencia-4821.png',
      bytes: 839_680,
      cargadoEn: haceHoras(5),
    },
    cuentaDeCobro: 'Nequi · 300 000 0000',
  },
  {
    id: '4812',
    estado: 'LIBERADO',
    rol: 'comprador',
    contraparte: { nombre: 'Daniel V.', handle: '@trq-7h3n', operaciones: 63 },
    archivos: [{
      nombre: 'dataset-clientes-2026.csv',
      extension: '.csv',
      bytes: 356_515_840,
      hash: '77de9b41a0c8e5f2361d4b7a9e0c3f85d264b1a7f930e5c8d41b6a29f0e390a4',
      subidoEn: haceHoras(52),
    }],
    montoCop: 200_000,
    creadaEn: haceHoras(52),
    liberaAutomaticaEn: null,
    purgaEn: enDias(26),
    comprobante: {
      nombre: 'comprobante-4812.pdf',
      bytes: 231_424,
      cargadoEn: haceHoras(9),
    },
  },
  {
    id: '4835',
    estado: 'EN_INSPECCION',
    rol: 'comprador',
    contraparte: { nombre: 'Carlos M.', handle: '@trq-9k2f', operaciones: 42 },
    archivos: [{
      nombre: 'masterclass-fotografia.mp4',
      extension: '.mp4',
      bytes: 1_932_735_283,
      hash: '4b10c7d9e2f8a3516b0c4d7e9f2a8b5c1d6e3f0a7b4c9d2e5f8a1b6c3d0e7ff3',
      subidoEn: haceHoras(14),
    }],
    montoCop: 120_000,
    creadaEn: haceHoras(14),
    liberaAutomaticaEn: null,
    purgaEn: enDias(29),
    comprobante: null,
  },
  {
    id: '4840',
    estado: 'EN_CUSTODIA',
    rol: 'vendedor',
    contraparte: { nombre: 'Lucía P.', handle: '@trq-2m8x', operaciones: 8 },
    archivos: [{
      nombre: 'plantillas-notion-pack.zip',
      extension: '.zip',
      bytes: 18_874_368,
      hash: '2c8f1e6b9d4a7051c3e8f2b6d9a4c7e0f3b8d1a6c9e2f5b8d1a4c7e0f3b6d9a2',
      subidoEn: haceHoras(3),
      archivosDentro: 12,
    }],
    montoCop: 60_000,
    creadaEn: haceHoras(3),
    liberaAutomaticaEn: null,
    purgaEn: enDias(29),
    comprobante: null,
    cuentaDeCobro: 'Bancolombia · ahorros 000-000000-00',
  },
  {
    id: '4829',
    estado: 'PAGO_ENVIADO',
    rol: 'comprador',
    contraparte: { nombre: 'Marta S.', handle: '@trq-5t1w', operaciones: 25 },
    archivos: [{
      nombre: 'identidad-visual-cafe.ai',
      extension: '.ai',
      bytes: 94_371_840,
      hash: '9e3b7c1f5a8d2064e7b1c4f8a2d5e9b3c6f0a4d7e1b5c8f2a6d9e3b7c0f4a8d1',
      subidoEn: haceHoras(40),
    }],
    montoCop: 310_000,
    creadaEn: haceHoras(40),
    liberaAutomaticaEn: enHoras(6.2),
    purgaEn: enDias(27),
    comprobante: {
      nombre: 'pago-4829.jpg',
      bytes: 1_048_576,
      cargadoEn: haceHoras(17.8),
    },
  },
]
