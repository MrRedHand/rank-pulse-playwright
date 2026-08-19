import type { ReactNode } from 'react'
import { Select as BaseSelect } from '@base-ui/react/select'
import styles from './index.module.css'

export type SelectOption = {
  value: string
  label: ReactNode
}

type SelectProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  items: SelectOption[]
}

export function Select({ label, value, onValueChange, items }: SelectProps) {
  return (
    <div className={styles.root}>
      <BaseSelect.Root
        value={value}
        onValueChange={(next) => {
          if (typeof next === 'string') {
            onValueChange(next)
          }
        }}
        items={items}
      >
        <BaseSelect.Label className={styles.label}>{label}</BaseSelect.Label>
        <BaseSelect.Trigger className={styles.trigger}>
          <BaseSelect.Value className={styles.value} />
          <BaseSelect.Icon className={styles.icon}>
            <CaretIcon />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner
            className={styles.positioner}
            alignItemWithTrigger={false}
            sideOffset={4}
          >
            <BaseSelect.Popup className={styles.popup}>
              <BaseSelect.List className={styles.list}>
                {items.map((item) => (
                  <BaseSelect.Item
                    key={item.value}
                    value={item.value}
                    className={styles.item}
                  >
                    <BaseSelect.ItemIndicator className={styles.itemIndicator}>
                      <CheckIcon />
                    </BaseSelect.ItemIndicator>
                    <BaseSelect.ItemText className={styles.itemText}>
                      {item.label}
                    </BaseSelect.ItemText>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </div>
  )
}

function CaretIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 6.5 8 10.5 12 6.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  )
}
