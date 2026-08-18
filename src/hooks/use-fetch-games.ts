import { useMutation } from '@tanstack/react-query'
import { fetchGameByLink } from '../api/games'

export function useFetchGame() {
  return useMutation({
    mutationFn: (link: string) => fetchGameByLink(link),
  })
}
