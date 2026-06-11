import type { User } from '../lib/types'
import styles from './AdminUserListItem.module.css'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type Props = {
  user: User
}

export default function AdminUserListItem({ user }: Props) {
  const badgeClass =
    user.role === 'ADMIN'
      ? `${styles.badge} ${styles.badgeAdmin}`
      : `${styles.badge} ${styles.badgeMember}`

  return (
    <div className={styles.card}>
      <div className={styles.avatar} aria-hidden>
        {initialsOf(user.name)}
      </div>
      <div className={styles.body}>
        <div className={styles.headerRow}>
          <p className={styles.name}>{user.name}</p>
          <span className={badgeClass}>{user.role}</span>
        </div>
        <p className={styles.email}>{user.email}</p>
      </div>
      <span className={styles.chevron} aria-hidden>
        ▾
      </span>
    </div>
  )
}
