/** Formateo de los datos de una orden. Sin dependencias. */

/** 450000 -> "$450.000". Sin decimales: los montos acordados son cifras redondas. */
export function formatearMonto(cop: number): string {
  return `$${cop.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}

/**
 * 252125184 -> "240,4 MB". Base 1024 (MiB), que es lo que reporta el sistema operativo
 * y contra lo que el usuario va a comparar.
 *
 * ⚠️ H1 — NO usar `i === 0 || valor >= 100 ? 0 : 1` para los decimales: esa condición mata
 * el decimal en TODO el rango de MB y "240,4 MB" sale como "240 MB". Y `minimumFractionDigits`
 * junto a `maximumFractionDigits` fuerza el decimal aunque sea cero, produciendo "18,0 MB".
 * Solo `maximumFractionDigits` da lo correcto. Verificado: 240,4 MB · 1,8 GB · 18 MB · 820 KB.
 */
export function formatearPeso(bytes: number): string {
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let valor = bytes
  let i = 0
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024
    i += 1
  }
  // Bytes y KB sin decimales: un "820,4 KB" no le dice nada a nadie.
  const decimales = i <= 1 ? 0 : 1
  return `${valor.toLocaleString('es-CO', {
    maximumFractionDigits: decimales,
  })} ${unidades[i]}`
}

/**
 * Hash completo -> "a3f97c2e…b3d2c21b".
 * En un teléfono, el hash entero ocupa 3 líneas y empuja todo lo demás: se muestra
 * abreviado y el completo vive tras un desplegable (ver HashField).
 */
export function hashCorto(hash: string): string {
  if (hash.length <= 20) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`
}

/** Versión muy corta para las tarjetas de la bandeja, donde el ancho es oro. */
export function hashMinimo(hash: string): string {
  if (hash.length <= 12) return hash
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`
}

/**
 * Tiempo que falta hasta `iso`, ej. "18 h 42 min".
 *
 * Devuelve null si ya pasó: quien llama decide qué mostrar, porque el texto correcto
 * depende del estado. NO es una cuenta regresiva en vivo: se calcula al renderizar.
 */
export function tiempoRestante(iso: string, ahora: Date = new Date()): string | null {
  const faltanMs = new Date(iso).getTime() - ahora.getTime()
  if (Number.isNaN(faltanMs) || faltanMs <= 0) return null

  const minutosTotales = Math.floor(faltanMs / 60000)
  const dias = Math.floor(minutosTotales / (60 * 24))
  if (dias >= 1) return `${dias} ${dias === 1 ? 'día' : 'días'}`

  const horas = Math.floor(minutosTotales / 60)
  const minutos = minutosTotales % 60
  if (horas >= 1) return `${horas} h ${minutos} min`
  return `${minutos} min`
}

/** ISO -> "20 sep 2026, 14:32". */
export function fechaLegible(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  const dia = fecha.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return `${dia}, ${hora}`
}

/** ISO -> "hace 5 h". Para eventos recientes. */
export function haceCuanto(iso: string, ahora: Date = new Date()): string {
  const pasadoMs = ahora.getTime() - new Date(iso).getTime()
  if (Number.isNaN(pasadoMs) || pasadoMs < 0) return 'recién'

  const minutos = Math.floor(pasadoMs / 60000)
  if (minutos < 60) return `hace ${Math.max(minutos, 1)} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
}
