import styles from './AdminStatCard.module.css'

type Props = {
  label: string
  value: string | number
  showDot?: boolean
}

export default function AdminStatCard({ label, value, showDot = false }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.label}>{label}</p>
      <div className={styles.row}>
        <p className={styles.value}>{value}</p>
        {showDot && <span className={styles.dot} aria-hidden />}
      </div>
    </div>
  )
}
