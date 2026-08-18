import { useQuery } from '@tanstack/react-query'
import { fetchParseJob } from '../api/parse'

export function useParseJob(jobId: string | null) {
  return useQuery({
    queryKey: ['parse-job', jobId],
    queryFn: () => fetchParseJob(jobId!),
    enabled: jobId !== null,
    refetchInterval: (query) =>
      query.state.data?.status === 'running' ? 1500 : false,
  })
}
