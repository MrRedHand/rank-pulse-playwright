import styles from './index.module.css'

export function SidebarHeader() {
  return (
    <header className={styles.header}>
      <p className={styles.title}>RankPulse</p>
      <p className={styles.subtitle}>Track app search rankings</p>
    </header>
  )
}
