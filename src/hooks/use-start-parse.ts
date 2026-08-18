import { useMutation } from '@tanstack/react-query'
import { startParse } from '../api/parse'

export function useStartParse() {
  return useMutation({
    mutationFn: startParse,
  })
}
