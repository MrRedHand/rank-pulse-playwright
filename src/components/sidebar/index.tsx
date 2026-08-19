import { SidebarFooter } from './footer'
import { SidebarHeader } from './header'
import { SidebarNav } from './nav'
import styles from './index.module.css'

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <SidebarHeader />
      <SidebarNav />
      <SidebarFooter />
    </aside>
  )
}
