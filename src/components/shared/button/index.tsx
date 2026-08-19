import type { ComponentProps } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import styles from './index.module.css'

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline'

type ButtonProps = Omit<ComponentProps<typeof BaseButton>, 'className'> & {
  variant?: ButtonVariant
  className?: string
}

const variantClass: Record<ButtonVariant, string> = {
  primary: styles.primary,
  ghost: styles.ghost,
  danger: styles.danger,
  outline: styles.outline,
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      {...props}
      type={type}
      className={[styles.button, variantClass[variant], className]
        .filter(Boolean)
        .join(' ')}
    />
  )
}
