import { useState, type ReactNode } from 'react'
import { Download, FileDown, HardDrive, Trash2, TriangleAlert } from 'lucide-react'
import { PanelShell } from '@/features/orders/components/PanelShell'
import { formatearPeso } from '@/features/orders/utils/format'
import {
  useAlmacenamiento,
  useBorrarArchivo,
  useBorrarHuerfano,
  useBorrarOrden,
} from '../hooks/useAlmacenamiento'
import {
  descargarArchivoAdmin,
  descargarOrdenZip,
  NoEsAdminError,
  type OrdenAdmin,
} from '../services/adminService'
import styles from './AdminPage.module.scss'

/**
 * Panel de almacenamiento. Una sola cuenta entra; para el resto no existe.
 *
 * 🔴 Esta pantalla ve y borra archivos de CUALQUIER usuario. Eso ya lo podía hacer quien
 * tuviera la clave SSH del servidor — lo que cambia es la puerta, de un `.pem` a una
 * sesión. Por eso el backend responde 404 a quien no es el administrador, y por eso aquí
 * se muestra ese 404 tal cual, sin explicar que existe un panel al que no llegas.
 */
export function AdminPage() {
  const { data, isLoading, error } = useAlmacenamiento()

  if (isLoading) {
    return (
      <PanelShell volverA="/panel">
        <p className={styles.cargando}>Leyendo el disco…</p>
      </PanelShell>
    )
  }

  if (error instanceof NoEsAdminError || !data) {
    return (
      <PanelShell volverA="/panel">
        <h1 className={styles.titulo}>Esta página no existe</h1>
        <p className={styles.vacio}>Comprueba la dirección o vuelve al panel.</p>
      </PanelShell>
    )
  }

  const usado = data.discoTotalBytes - data.discoLibreBytes
  const porcentaje = Math.round((usado / data.discoTotalBytes) * 100)

  return (
    <PanelShell volverA="/panel">
      <h1 className={styles.titulo}>Almacenamiento</h1>
      <p className={styles.intro}>
        Todo lo que hay en <code>data/custodia/</code> del servidor, cruzado con la base de
        datos. Lo que borres aquí no se recupera.
      </p>

      <section className={styles.disco}>
        <div className={styles.discoCabecera}>
          <HardDrive size={18} aria-hidden="true" />
          <span className={styles.discoTitulo}>Disco del servidor</span>
          <span className={styles.discoCifra}>
            {formatearPeso(data.discoLibreBytes)} libres de{' '}
            {formatearPeso(data.discoTotalBytes)}
          </span>
        </div>
        <div className={styles.barra} role="img" aria-label={`Disco al ${porcentaje}%`}>
          <span className={styles.barraLlena} style={{ width: `${porcentaje}%` }} />
        </div>
        <p className={styles.discoNota}>
          Custodia ocupa {formatearPeso(data.custodiaBytes)} · disco al {porcentaje}%
        </p>
      </section>

      <h2 className={styles.seccion}>Órdenes ({data.ordenes.length})</h2>
      {data.ordenes.length === 0 ? (
        <p className={styles.vacio}>No hay ninguna orden todavía.</p>
      ) : (
        data.ordenes.map((orden) => <TarjetaOrdenAdmin key={orden.id} orden={orden} />)
      )}

      <h2 className={styles.seccion}>Carpetas sin orden ({data.huerfanos.length})</h2>
      <p className={styles.intro}>
        Carpetas que están en el disco y no corresponden a ninguna orden — restos de una
        subida que falló a medias. Nadie las ve desde la app y nadie las borra.
      </p>
      {data.huerfanos.length === 0 ? (
        <p className={styles.vacio}>Ninguna. El disco está limpio.</p>
      ) : (
        data.huerfanos.map((huerfano) => (
          <FilaHuerfano
            key={huerfano.nombre}
            nombre={huerfano.nombre}
            bytes={huerfano.bytes}
            archivos={huerfano.archivos}
          />
        ))
      )}
    </PanelShell>
  )
}

function TarjetaOrdenAdmin({ orden }: { orden: OrdenAdmin }) {
  const borrarOrden = useBorrarOrden()
  const borrarArchivo = useBorrarArchivo()
  const [bajando, setBajando] = useState(false)

  // 🔴 En una orden PURGADA que no queden bytes es lo ESPERADO, no una anomalía: alguien
  // la borró a propósito y la base conserva el rastro. Pintar eso en rojo entrena a
  // ignorar la alerta, que es justo lo contrario de para lo que existe este panel.
  const purgada = orden.estado === 'PURGADO'
  // Ya no hay nada que borrar: el botón solo sobreviviría como ruido.
  const sePuedeBorrar = !purgada || orden.bytesEnDisco > 0

  async function bajarZip() {
    setBajando(true)
    try {
      await descargarOrdenZip(orden.id)
    } finally {
      setBajando(false)
    }
  }

  return (
    <article className={styles.orden}>
      <header className={styles.ordenCabecera}>
        <span className={styles.ordenId}>#{orden.id}</span>
        <span className={styles.ordenEstado}>{orden.estado.replace('_', ' ')}</span>
        <span className={styles.ordenPartes}>
          {orden.vendedor} → {orden.comprador}
        </span>
        <span className={styles.ordenPeso}>{formatearPeso(orden.bytesEnDisco)} en disco</span>
      </header>

      <ul className={styles.archivos}>
        {orden.archivos.map((archivo) => (
          <li key={archivo.id} className={styles.archivo}>
            <span className={styles.archivoNombre}>{archivo.nombre}</span>
            <span className={styles.archivoPeso}>{formatearPeso(archivo.bytes)}</span>
            {archivo.enDisco ? (
              <>
                <button
                  type="button"
                  className={styles.iconoBoton}
                  aria-label={`Descargar ${archivo.nombre}`}
                  onClick={() => {
                    void descargarArchivoAdmin(orden.id, archivo.id, archivo.nombre)
                  }}
                >
                  <Download size={14} aria-hidden="true" />
                </button>
                <BotonConfirmar
                  etiqueta={`Borrar ${archivo.nombre}`}
                  pendiente={borrarArchivo.isPending}
                  alConfirmar={() => {
                    borrarArchivo.mutate({ ordenId: orden.id, archivoId: archivo.id })
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </BotonConfirmar>
              </>
            ) : purgada ? (
              <span className={styles.purgado}>purgado</span>
            ) : (
              <span className={styles.ausente}>
                <TriangleAlert size={13} aria-hidden="true" />
                no está en disco
              </span>
            )}
          </li>
        ))}
        {orden.archivos.length === 0 && <li className={styles.archivoVacio}>Sin archivos.</li>}
      </ul>

      {sePuedeBorrar && (
        <footer className={styles.ordenPie}>
          <button
            type="button"
            className={styles.botonZip}
            disabled={bajando || orden.bytesEnDisco === 0}
            onClick={() => void bajarZip()}
          >
            <FileDown size={15} aria-hidden="true" />
            {bajando ? 'Preparando…' : 'Backup ZIP'}
          </button>
          <BotonConfirmar
            etiqueta={`Borrar toda la orden ${orden.id}`}
            texto="Borrar orden"
            pendiente={borrarOrden.isPending}
            alConfirmar={() => {
              borrarOrden.mutate(orden.id)
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
            Borrar orden
          </BotonConfirmar>
        </footer>
      )}

      {(borrarOrden.error ?? borrarArchivo.error) && (
        <p className={styles.error}>
          {(borrarOrden.error ?? borrarArchivo.error)?.message}
        </p>
      )}
    </article>
  )
}

function FilaHuerfano({
  nombre,
  bytes,
  archivos,
}: {
  nombre: string
  bytes: number
  archivos: number
}) {
  const borrar = useBorrarHuerfano()

  return (
    <div className={styles.huerfano}>
      <span className={styles.huerfanoNombre}>carpeta {nombre}</span>
      <span className={styles.huerfanoDatos}>
        {archivos} archivo{archivos === 1 ? '' : 's'} · {formatearPeso(bytes)}
      </span>
      <BotonConfirmar
        etiqueta={`Borrar la carpeta ${nombre}`}
        texto="Borrar"
        pendiente={borrar.isPending}
        alConfirmar={() => {
          borrar.mutate(nombre)
        }}
      >
        <Trash2 size={15} aria-hidden="true" />
        Borrar
      </BotonConfirmar>
      {borrar.error && <p className={styles.error}>{borrar.error.message}</p>}
    </div>
  )
}

interface BotonConfirmarProps {
  /** Nombre accesible: dice QUÉ se borra, que el icono no puede decir. */
  etiqueta: string
  texto?: string
  pendiente: boolean
  alConfirmar: () => void
  children: ReactNode
}

/**
 * Un borrado en dos tiempos.
 *
 * Aquí el primer clic afecta archivos de otra gente y no hay papelera de reciclaje, así
 * que pulsar una vez solo arma la pregunta. Misma mecánica que en el panel del vendedor.
 */
function BotonConfirmar({
  etiqueta,
  texto,
  pendiente,
  alConfirmar,
  children,
}: BotonConfirmarProps) {
  const [confirmando, setConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <button
        type="button"
        className={texto ? styles.botonNeutro : styles.iconoBoton}
        aria-label={etiqueta}
        onClick={() => {
          setConfirmando(true)
        }}
      >
        {children}
      </button>
    )
  }

  return (
    <span className={styles.confirma}>
      <button
        type="button"
        className={styles.botonPeligro}
        aria-label={`Confirmar: ${etiqueta}`}
        disabled={pendiente}
        onClick={alConfirmar}
      >
        {pendiente ? 'Borrando…' : 'Sí, borrar'}
      </button>
      <button
        type="button"
        className={styles.botonNeutro}
        aria-label={`Cancelar: ${etiqueta}`}
        onClick={() => {
          setConfirmando(false)
        }}
      >
        No
      </button>
    </span>
  )
}
