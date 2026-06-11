import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CreateGearSchema, GearClassification } from '@rentala_project/shared'
import type { GearClassification as GearClassificationType } from '@rentala_project/shared'
import { api, ApiError } from '../lib/api'
import type { Gear } from '../lib/types'
import { useAuthStore } from '../store/useAuthStore'
import styles from './admin_.gear.new.module.css'

const NEW_CATEGORY_SENTINEL = '__new__'

type FieldErrors = Partial<Record<'name' | 'serial' | 'category' | 'form', string>>

export const Route = createFileRoute('/admin_/gear/new')({
  component: AddGearPage,
})

function AddGearPage() {
  const { user, loading: authLoading } = useAuthStore()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [serial, setSerial] = useState('')
  const [category, setCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [classification, setClassification] = useState<GearClassificationType>(GearClassification.EVENT)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    api
      .get<Gear[]>('/api/v1/gear')
      .then((gear) => {
        if (cancelled) return
        const unique = Array.from(new Set(gear.map((g) => g.category))).sort((a, b) =>
          a.localeCompare(b),
        )
        setCategories(unique)
      })
      .catch(() => {
        if (cancelled) return
        setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const categoryValue = useMemo(
    () => (category === NEW_CATEGORY_SENTINEL ? newCategory : category).trim(),
    [category, newCategory],
  )

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (name.trim().length === 0) next.name = 'Required'
    if (serial.trim().length === 0) next.serial = 'Required'
    if (category === '') next.category = 'Pick a category'
    else if (category === NEW_CATEGORY_SENTINEL && newCategory.trim().length === 0)
      next.category = 'Enter the new category name'
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      name: name.trim(),
      serialNumber: serial.trim(),
      category: categoryValue,
      classification,
    }
    const parsed = CreateGearSchema.safeParse(payload)
    if (!parsed.success) {
      setErrors({ form: 'Please fix the highlighted fields.' })
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      await api.post('/api/v1/gear', parsed.data)
      navigate({ to: '/admin' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ serial: 'Serial number already in use' })
      } else {
        setErrors({ form: 'Could not add gear. Please try again.' })
      }
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.stateMsg}>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <p className={styles.stateMsg}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => navigate({ to: '/login', search: { redirect: '/admin/gear/new' } })}
          >
            Please log in
          </button>
          {' '}to add gear.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Back"
            onClick={() => navigate({ to: '/admin' })}
          >
            ←
          </button>
          <h1 className={styles.title}>Add New Gear</h1>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Close"
          onClick={() => navigate({ to: '/admin' })}
        >
          ×
        </button>
      </header>

      <form className={styles.main} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="gear-name">Device Name</label>
          <input
            id="gear-name"
            className={`${styles.input}${errors.name ? ` ${styles.inputError}` : ''}`}
            placeholder="e.g. Cinema Rig 01"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <p className={styles.fieldError}>{errors.name}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="gear-serial">Serial Number</label>
          <input
            id="gear-serial"
            className={`${styles.input}${errors.serial ? ` ${styles.inputError}` : ''}`}
            placeholder="SN-8829-XJ"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
          />
          {errors.serial && <p className={styles.fieldError}>{errors.serial}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="gear-category">Category</label>
          <select
            id="gear-category"
            className={`${styles.select}${errors.category ? ` ${styles.inputError}` : ''}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value={NEW_CATEGORY_SENTINEL}>+ Add new category…</option>
          </select>
          {category === NEW_CATEGORY_SENTINEL && (
            <input
              className={styles.input}
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
          )}
          {errors.category && <p className={styles.fieldError}>{errors.category}</p>}
        </div>

        <div className={styles.field}>
          <p className={styles.label}>Gear Classification</p>
          <div className={styles.classificationGrid}>
            <button
              type="button"
              className={`${styles.classOption}${classification === GearClassification.EVENT ? ` ${styles.classOptionActive}` : ''}`}
              onClick={() => setClassification(GearClassification.EVENT)}
              aria-pressed={classification === GearClassification.EVENT}
            >
              Event Gear
              {classification === GearClassification.EVENT && <span className={styles.classCheck}>✓</span>}
            </button>
            <button
              type="button"
              className={`${styles.classOption}${classification === GearClassification.NON_EVENT ? ` ${styles.classOptionActive}` : ''}`}
              onClick={() => setClassification(GearClassification.NON_EVENT)}
              aria-pressed={classification === GearClassification.NON_EVENT}
            >
              Non-Event Gear
              {classification === GearClassification.NON_EVENT && <span className={styles.classCheck}>✓</span>}
            </button>
          </div>
        </div>

        {errors.form && <p className={styles.formError}>{errors.form}</p>}

        <button type="submit" className={styles.submit} disabled={submitting}>
          <span aria-hidden>＋</span>
          {submitting ? 'Adding…' : 'ADD ITEM'}
        </button>
      </form>
    </div>
  )
}
