import { NavLink } from 'react-router-dom'
import styles from './index.module.css'

export function SidebarNav() {
  return (
    <nav className={styles.nav} aria-label="Main">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          [styles.link, isActive ? styles.active : ''].filter(Boolean).join(' ')
        }
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/keywords"
        className={({ isActive }) =>
          [styles.link, isActive ? styles.active : ''].filter(Boolean).join(' ')
        }
      >
        Keywords
      </NavLink>
    </nav>
  )
}
