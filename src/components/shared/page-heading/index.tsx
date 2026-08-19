import styles from './index.module.css'

export function PageHeading({ title }: { title: string }) {
  return <h1 className={styles.heading}>{title}</h1>
}
