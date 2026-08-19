import type { ComponentProps } from 'react'
import { Input as BaseInput } from '@base-ui/react/input'
import styles from './index.module.css'

type InputProps = Omit<ComponentProps<typeof BaseInput>, 'className'> & {
  className?: string
}

export function Input({ className, ...props }: InputProps) {
  return (
    <BaseInput
      {...props}
      className={[styles.input, className].filter(Boolean).join(' ')}
    />
  )
}

type TextareaProps = ComponentProps<'textarea'>

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={[styles.textarea, className].filter(Boolean).join(' ')}
    />
  )
}
