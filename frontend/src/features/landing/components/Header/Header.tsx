import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Logo } from '@/shared/components/Logo'
import { Button } from '@/shared/components/Button'
import { NAV_LINKS } from '../../data/landingContent'
import type { AuthTab } from '@/features/auth/components/AuthPanel'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations'
import styles from './Header.module.scss'

interface HeaderProps {
  onGoToAuth: (tab: AuthTab) => void
}

export function Header({ onGoToAuth }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const logoutMutation = useLogoutMutation()

  function handleAuthClick(tab: AuthTab) {
    setMenuOpen(false)
    onGoToAuth(tab)
  }

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Logo variant="header" />

        <nav className={styles.nav}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className={styles.burger}
          aria-label="Menú"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.burgerBar} />
          <span className={styles.burgerBar} />
          <span className={`${styles.burgerBar} ${styles.burgerBarAccent}`} />
        </button>

        <div className={styles.actions}>
          {user ? (
            <>
              <span className={styles.userHandle} title={user.email}>
                {user.handle}
              </span>
              <button
                type="button"
                className={styles.logoutButton}
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                aria-label="Cerrar sesión"
              >
                <LogOut size={15} aria-hidden="true" />
                Salir
              </button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleAuthClick('login')}>
                Entrar
              </Button>
              <Button variant="primary" size="md" onClick={() => handleAuthClick('register')}>
                Crear cuenta
              </Button>
            </>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className={styles.menuPanel}>
          <div className={styles.menuList}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={styles.menuLink}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
