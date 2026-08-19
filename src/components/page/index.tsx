import type { ReactNode } from 'react'
import { PageHeading } from '../page-heading'
import styles from './index.module.css'

type PageProps = {
  title: string
  children: ReactNode
}

export function Page({ title, children }: PageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <PageHeading title={title} />
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  )
}
