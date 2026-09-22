export interface NavLink {
  label: string
  href: string
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Inspección', href: '#inspeccion' },
  { label: 'Garantías', href: '#garantias' },
  { label: 'Preguntas', href: '#preguntas' },
]

export const HERO = {
  badge: 'Transacción protegida de punta a punta',
  title: 'Comprar y vender archivos, con las dos partes protegidas.',
  paragraph:
    'El vendedor sube el archivo a custodia y comparte su ficha técnica: extensión, peso, metadata y hash. Tú verificas todo, pagas por fuera —el dinero nunca pasa por aquí— y descargas cuando él libera. Al descargarse, el archivo se borra de nuestros servidores.',
  benefits: [
    {
      lead: 'Transacción segura para ambos.',
      rest: 'Vendedor y comprador quedan cubiertos por las mismas reglas.',
      tone: 'accent' as const,
    },
    {
      lead: 'El archivo se purga al descargarse.',
      rest: 'Solo permanece en el sistema durante la transacción: más privacidad para quien vende.',
      tone: 'accent' as const,
    },
    {
      lead: 'Recibes lo que negociaste.',
      rest: 'El comprador verifica la ficha y el hash antes de pagar y al descargar.',
      tone: 'signal' as const,
    },
  ],
}

/** Los 6 estados del pipeline. El `icon` lo resuelve HowItWorks con un switch. */
export type StepIcon = 'upload' | 'search' | 'money' | 'release' | 'download' | 'purge'
export type StepTone = 'soft' | 'accent' | 'plain' | 'signal' | 'dashed'

export interface PipelineStep {
  number: string
  chip: string
  title: string
  caption: string
  icon: StepIcon
  tone: StepTone
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    number: '01',
    chip: 'EN CUSTODIA',
    title: 'Sube y comparte',
    caption: 'Elige el @usuario del comprador.',
    icon: 'upload',
    tone: 'soft',
  },
  {
    number: '02',
    chip: 'EN INSPECCIÓN',
    title: 'Inspecciona',
    caption: 'Extensión, peso, metadata y hash.',
    icon: 'search',
    tone: 'accent',
  },
  {
    number: '03',
    chip: 'PAGO ENVIADO',
    title: 'Paga por fuera',
    caption: 'Directo al vendedor, fuera de la app.',
    icon: 'money',
    tone: 'plain',
  },
  {
    number: '04',
    chip: 'LIBERADO',
    title: 'Libera',
    caption: 'Recibido el pago, habilita la descarga.',
    icon: 'release',
    tone: 'plain',
  },
  {
    number: '05',
    chip: 'DESCARGADO',
    title: 'Descarga',
    caption: 'Se comprueba el hash al terminar.',
    icon: 'download',
    tone: 'signal',
  },
  {
    number: '06',
    chip: 'PURGADO',
    title: 'Purga',
    caption: 'El archivo se borra. Sin copias.',
    icon: 'purge',
    tone: 'dashed',
  },
]

export const SELLER = {
  role: 'VENDEDOR',
  name: 'Carlos M.',
  handle: '@trq-9k2f',
  chip: '42 ÓRDENES',
  chipNote: '100% liberadas',
  caption: 'Sube sus archivos y libera al recibir el pago.',
  photo: 'https://i.pravatar.cc/480?img=12',
  photoAlt: 'Foto del vendedor',
}

export const BUYER = {
  role: 'COMPRADOR',
  name: 'Ana R.',
  handle: '@trq-4f7k',
  chip: '17 COMPRAS',
  chipNote: 'cuenta verificada',
  caption: 'Inspecciona la ficha, paga y descarga.',
  photo: 'https://i.pravatar.cc/480?img=45',
  photoAlt: 'Foto de la compradora',
}

export const FILE_CARD = {
  extension: 'PSD',
  name: 'catalogo-otoño-master.psd',
  order: 'ORDEN #4821',
  metadata: [
    { label: 'EXTENSIÓN', value: '.psd · Adobe Photoshop', accent: false },
    { label: 'TAMAÑO', value: '1.84 GB (1 976 445 184 bytes)', accent: false },
    { label: 'DIMENSIONES', value: '5 906 × 8 268 px · 300 dpi', accent: false },
    { label: 'CAPAS', value: '148 · CMYK · sin aplanar', accent: false },
    { label: 'EN CUSTODIA DESDE', value: '28 ago 2026, 14:02', accent: false },
    { label: 'PRECIO ACORDADO', value: '$ 420 000 COP', accent: true },
  ],
  hashLabel: 'HASH SELLADO AL SUBIR · SHA-256',
  hash: '9f2c4ab1e7d80355c6ae19f4b23d70e8a1c5fd6207bb94e3812a0cf7d45b6e91',
}

export const GUARANTEES = [
  {
    eyebrow: '01 · INTEGRIDAD',
    title: 'Hash sellado',
    text: 'Se registra al subir y se comprueba al descargar. Nadie cobra por un archivo y entrega otro.',
  },
  {
    eyebrow: '02 · ENTREGA',
    title: 'Liberación por tiempo',
    text: 'Con comprobante cargado, si el vendedor no libera en 24 h la plataforma habilita la descarga por él.',
  },
  {
    eyebrow: '03 · PRIVACIDAD',
    title: 'Purga al descargar',
    text: 'Confirmada la descarga, el archivo se borra. Órdenes sin cerrar se purgan a los 30 días.',
  },
  {
    eyebrow: '04 · REPUTACIÓN',
    title: 'Historial público',
    text: 'Órdenes pagadas y no liberadas quedan visibles en el perfil del vendedor, con su tiempo de respuesta.',
  },
]

export const FAQ_ITEMS = [
  {
    question: '¿Ustedes pueden abrir mi archivo?',
    answer:
      'No. Se cifra en el equipo del vendedor antes de subirse; guardamos el contenido cifrado, no la llave.',
  },
  {
    question: '¿Quién puede ver el archivo compartido?',
    answer:
      'Solo el @usuario que el vendedor indicó al crear la orden. No hay enlaces públicos: si el handle está mal escrito, la orden no se crea y no se comparte nada.',
  },
  {
    question: '¿Y si pago y el vendedor no libera?',
    answer:
      'Con el comprobante cargado, a las 24 h la plataforma habilita la descarga a tu favor.',
  },
  {
    question: '¿Cuánto tiempo guardan el archivo?',
    answer:
      'Hasta que se descargue: ahí se purga. Si la orden no se cierra, se borra a los 30 días.',
  },
]
