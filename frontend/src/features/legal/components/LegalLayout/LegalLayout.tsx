import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/shared/components/Logo'
import { Footer } from '@/features/landing/components/Footer'
import styles from './LegalLayout.module.scss'

interface LegalLayoutProps {
  title: string
  actualizado: string
  children: ReactNode
}

export function LegalLayout({ title, actualizado, children }: LegalLayoutProps) {
  return (
    <div className={styles.page}>
      <div className={styles.bar}>
        <Logo variant="badge" />
        <Link to="/" className={styles.back}>
          ← Volver
        </Link>
      </div>

      <main className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Última actualización: {actualizado}</p>
        <div className={styles.content}>{children}</div>
      </main>

      <Footer />
    </div>
  )
}
