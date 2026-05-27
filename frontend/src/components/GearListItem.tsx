import styles from './GearListItem.module.css'

interface GearListItemProps {
  name: string
  brand: string
  added?: boolean
  onInfo?: () => void
  onAdd?: () => void
  onRemove?: () => void
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M7 1L5.5 3H2C1.17 3 0.5 3.67 0.5 4.5V14.5C0.5 15.33 1.17 16 2 16H18C18.83 16 19.5 15.33 19.5 14.5V4.5C19.5 3.67 18.83 3 18 3H14.5L13 1H7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="9.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function GearListItem({ name, brand, added = false, onInfo, onAdd, onRemove }: GearListItemProps) {
  function handleAddRemove() {
    if (added) {
      onRemove?.()
    } else {
      onAdd?.()
    }
  }

  return (
    <div className={styles.item}>
      <div className={styles.iconBg}>
        <CameraIcon />
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={styles.brand}>{brand}</span>
      </div>
      <div className={styles.buttonGroup}>
        <button className={styles.btnInfo} onClick={onInfo} type="button">
          Info
        </button>
        <button
          className={added ? styles.btnRemove : styles.btnAdd}
          onClick={handleAddRemove}
          type="button"
        >
          {added ? 'Remove' : 'Add'}
        </button>
      </div>
    </div>
  )
}
